import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'
import * as Routing from '@routing/index.ts'
import { FastRouter } from '@neabyte/fast-router'

/**
 * Core request handler engine.
 * @description Manages routes, middleware, statics, and dispatch.
 */
export class Handler {
  /** Registered entry middleware list */
  #entryMiddleware: Types.MiddlewareEntry[] = []
  /** Registered global error middleware */
  #errorMiddleware: Types.ErrorMiddleware | null = null
  /** Underlying fast router instance */
  #routerInstance = new FastRouter<Types.RouteEntry>()
  /** Observability event emitter */
  readonly #events = new Core.Observability()
  /** Maximum allowed route parameter length */
  readonly #maxParamLength: number
  /** Maximum allowed request URL length */
  readonly #maxUrlLength: number
  /** Registered static mount list */
  readonly #staticMounts: Types.StaticMount[] = []
  /** Request timeout in milliseconds */
  readonly #timeoutMs: number | undefined
  /** Trusted proxy IP matcher */
  readonly #trustTester: Types.IpMatcher | null
  /** View rendering engine instance */
  readonly #viewEngine: Core.Rendering | null
  /** Resolved routes directory path */
  readonly #routesDir: string
  /** Worker controller for offloading */
  readonly #workerController: Types.WorkerController | null
  /** Worker pool instance */
  readonly #workerPool: Core.Worker | null

  /**
   * Create request handler.
   * @description Resolves limits, proxy, views, and worker pool.
   * @param options - Optional router configuration
   */
  constructor(options?: Types.RouterOptions) {
    this.#routesDir = options?.routes?.directory ?? './routes'
    this.#maxUrlLength = Handler.#resolveLimit(
      options?.maxUrlLength,
      Core.Constant.maxUrlLength,
      'maxUrlLength'
    )
    this.#maxParamLength = Handler.#resolveLimit(
      options?.routes?.maxParamLength,
      Core.Constant.maxParamLength,
      'maxParamLength'
    )
    if (options?.timeoutMs !== undefined) {
      Core.Handler.assertPositiveFinite(options.timeoutMs, 'timeoutMs', 'milliseconds')
    }
    this.#timeoutMs = options?.timeoutMs
    this.#trustTester = Core.IpResolver.compile(options?.trustProxy)
    this.#viewEngine = options?.views !== undefined
      ? new Core.Rendering(options.views, (event) => this.#events.emit(event))
      : null
    this.#workerPool = options?.worker !== undefined
      ? Core.Worker.createPool(options.worker, (event) => this.#events.emit(event))
      : null
    this.#workerController = this.#workerPool === null
      ? null
      : { run: (payload) => this.#workerPool!.run(payload) }
  }

  /** Resolved routes directory path */
  get routesDir(): string {
    return this.#routesDir
  }

  /** View rendering engine or null */
  get viewEngine(): Core.Rendering | null {
    return this.#viewEngine
  }

  /**
   * Register path-scoped middleware handlers.
   * @description Validates and appends middleware entries.
   * @param path - Path scope for the middleware
   * @param handlers - Middleware functions to register
   * @throws {TypeError} When a handler is not function
   */
  addMiddleware(path: string, handlers: Types.MiddlewareFn[]): void {
    for (const middlewareHandler of handlers) {
      if (typeof middlewareHandler !== 'function') {
        throw new TypeError(
          `Middleware for "${path || '*'}" must be a function, got ${typeof middlewareHandler}`
        )
      }
      this.#entryMiddleware.push({ path, handler: middlewareHandler })
    }
  }

  /**
   * Mount static file source.
   * @description Normalizes prefix and sorts by length.
   * @param urlPrefix - URL prefix to mount under
   * @param source - Static handler or serve options
   */
  addStatic(urlPrefix: string, source: Types.StaticFn | Types.ServeOptions): void {
    const handler = typeof source === 'function' ? source : Handler.#fileHandler(urlPrefix, source)
    this.#staticMounts.push({ urlPrefix: Handler.#normalizePrefix(urlPrefix), handler })
    this.#staticMounts.sort((first, second) => second.urlPrefix.length - first.urlPrefix.length)
  }

  /** Build Deno serve request handler */
  createHandler(): Types.ServeHandler {
    return async (req: Request, info?: Deno.ServeHandlerInfo) => {
      const isHead = req.method === 'HEAD'
      const sourceReq = isHead ? new Core.API.Request(req, { method: 'GET' }) : req
      const observe = this.#events.hasListeners()
      const requestStart = observe ? performance.now() : 0
      const holder: Types.RequestHolder = {
        ctx: null,
        frameworkError: null,
        parsedUrl: undefined,
        routePattern: undefined
      }
      const remoteAddr = info?.remoteAddr
      const directIp = remoteAddr && remoteAddr.transport === 'tcp'
        ? remoteAddr.hostname
        : undefined
      let finalResponse: Response
      try {
        const clientIp = Core.IpResolver.resolve(directIp, sourceReq.headers, this.#trustTester)
        finalResponse = this.#timeoutMs !== undefined && this.#timeoutMs > 0
          ? await this.#withTimeout(sourceReq, holder, clientIp, directIp)
          : await this.#handleRequest(sourceReq, holder, clientIp, directIp)
      } catch (fatalError) {
        holder.frameworkError = Core.Handler.extractError(fatalError).error
        finalResponse = Routing.Respond.safeServerError(sourceReq, 500)
      }
      if (!Routing.Respond.isGenuine(finalResponse)) {
        finalResponse = Routing.Respond.safeServerError(sourceReq, 500)
      }
      if (observe) {
        Routing.Report.reportRequest(
          (event) => this.#events.emit(event),
          sourceReq,
          finalResponse,
          requestStart,
          holder,
          false
        )
      }
      return isHead ? await Routing.Respond.toHeadResponse(finalResponse) : finalResponse
    }
  }

  /**
   * Emit an observability event.
   * @description Forwards event to internal emitter.
   * @param event - Event to emit
   */
  emitEvent(event: Types.EventBase): void {
    this.#events.emit(event)
  }

  /**
   * Subscribe to handler events.
   * @description Registers listener for emitted events.
   * @param listener - Event listener function
   * @returns Unsubscribe function removing the listener
   */
  onEvent(listener: Types.EventFn): () => void {
    return this.#events.on(listener)
  }

  /**
   * Reload a single route module.
   * @description Reimports, validates, and re-registers the route.
   * @param fullPath - Absolute module file path
   * @param routePath - Relative route file path
   * @returns Promise resolving when reload completes
   */
  async reloadRoute(fullPath: string, routePath: string): Promise<void> {
    const routePattern = Routing.Scanner.createPattern(routePath, Core.Constant.allowedExtensions)
    if (routePattern === null) {
      return
    }
    try {
      const fileModule = await Core.API.importRouteModule(fullPath, true)
      Routing.Scanner.validateModule(fileModule, routePath, Core.Constant.httpMethods)
      this.removeRoute(routePattern)
      Routing.Scanner.registerHandlers(
        this.#routerInstance,
        fileModule,
        routePattern,
        Core.Constant.httpMethods
      )
      this.#events.emit(
        Core.Observability.internalEvent('route:updated', { routePath, pattern: routePattern })
      )
    } catch (reloadError) {
      this.#events.emit(
        Core.Observability.internalEvent('route:failed', {
          routePath,
          error: reloadError instanceof Error ? reloadError : new Error(String(reloadError))
        })
      )
    }
  }

  /**
   * Remove route across all methods.
   * @description Deletes pattern from every HTTP method.
   * @param routePattern - Route pattern to remove
   */
  removeRoute(routePattern: string): void {
    for (const method of Core.Constant.httpMethods) {
      this.#routerInstance.remove(method, routePattern)
    }
  }

  /** Scan routes directory for handlers */
  async scanRoutes(): Promise<void> {
    await Routing.Scanner.explore(
      this.#routerInstance,
      this.#routesDir,
      '',
      Core.Constant.httpMethods,
      Core.Constant.allowedExtensions,
      this.#events.hasListeners() ? (event) => this.#events.emit(event) : null
    )
  }

  /**
   * Set global error middleware.
   * @description Stores handler invoked on unhandled errors.
   * @param errorMiddleware - Error middleware to register
   */
  setErrorMiddleware(errorMiddleware: Types.ErrorMiddleware): void {
    this.#errorMiddleware = errorMiddleware
  }

  /** Terminate worker pool if present */
  terminate(): void {
    if (this.#workerPool !== null) {
      this.#workerPool.terminate()
    }
  }

  /**
   * Test middleware entry path match.
   * @description Supports exact, prefix, and wildcard paths.
   * @param entryPath - Configured middleware path
   * @param pathname - Request pathname to test
   * @returns True when entry applies to pathname
   */
  static #entryMatchesPath(entryPath: string, pathname: string): boolean {
    if (entryPath === '' || entryPath === '*') {
      return true
    }
    if (entryPath.endsWith('/**')) {
      const prefix = entryPath.slice(0, -3)
      return pathname === prefix || pathname.startsWith(`${prefix}/`)
    }
    return pathname === entryPath || pathname.startsWith(`${entryPath}/`)
  }

  /**
   * Run matching middleware chain.
   * @description Dispatches middleware respecting next call order.
   * @param ctx - Request context to pass through
   * @param pathname - Request pathname for matching
   * @returns Response when produced or undefined
   * @throws {Error} When next called multiple times
   * @throws {TypeError} When middleware returns invalid value
   */
  async #executeMiddlewares(
    ctx: Core.Context,
    pathname: string
  ): Promise<Response | undefined> {
    let lastIndex = -1
    const dispatch = async (index: number): Promise<Response | undefined> => {
      if (index <= lastIndex) {
        throw new Error('next() called multiple times')
      }
      lastIndex = index
      if (index >= this.#entryMiddleware.length) {
        return undefined
      }
      const middlewareEntry = this.#entryMiddleware[index]!
      if (!Handler.#entryMatchesPath(middlewareEntry.path, pathname)) {
        return await dispatch(index + 1)
      }
      let nextCalled = false
      const next: Types.NextFn = () => {
        nextCalled = true
        return dispatch(index + 1)
      }
      const middlewareResponse = await middlewareEntry.handler(ctx, next)
      if (middlewareResponse === undefined) {
        return nextCalled ? undefined : await dispatch(index + 1)
      }
      if (Routing.Respond.isGenuine(middlewareResponse)) {
        return middlewareResponse
      }
      throw new TypeError(
        `Middleware "${middlewareEntry.path || '*'}" must return a Response or undefined`
      )
    }
    return await dispatch(0)
  }

  /**
   * Build static file serve handler.
   * @description Validates options path and wraps serveFile.
   * @param urlPrefix - URL prefix for error messages
   * @param options - Static serve options
   * @returns Static file handler function
   * @throws {TypeError} When options path is empty
   */
  static #fileHandler(urlPrefix: string, options: Types.ServeOptions): Types.StaticFn {
    if (typeof options.path !== 'string' || options.path.length === 0) {
      throw new TypeError(`static("${urlPrefix}") requires a non-empty options path`)
    }
    return (ctx, urlPath) => Core.Static.serveFile(ctx, options, urlPath)
  }

  /**
   * Handle a single request.
   * @description Runs middleware, routing, statics, and errors.
   * @param req - Incoming request to handle
   * @param holder - Request state holder
   * @param clientIp - Resolved client IP address
   * @param directIp - Direct connection IP address
   * @returns Promise resolving to final response
   */
  async #handleRequest(
    req: Request,
    holder: Types.RequestHolder,
    clientIp: string | undefined,
    directIp: string | undefined
  ): Promise<Response> {
    if (req.url.length > this.#maxUrlLength) {
      holder.frameworkError = new Deno.errors.InvalidData(
        'Request URL exceeds maximum allowed length'
      )
      return Routing.Respond.negotiatedError(req, 414, 'URI Too Long')
    }
    holder.parsedUrl = new Core.API.URL(req.url)
    const pathname = holder.parsedUrl.pathname
    const ctx = new Core.Context(
      req,
      holder.parsedUrl,
      this.#errorMiddleware,
      clientIp,
      directIp,
      this.#viewEngine === null
        ? null
        : (template, data, options) => this.#viewEngine!.render(template, data, options),
      (event) => this.#events.emit(event)
    )
    holder.ctx = ctx
    if (this.#workerController !== null) {
      Core.Context.internalOf(ctx).installWorker(this.#workerController)
    }
    try {
      if (this.#entryMiddleware.length > 0) {
        const middlewareResult = await this.#executeMiddlewares(ctx, pathname)
        if (middlewareResult !== undefined) {
          return middlewareResult
        }
      }
      const routeResult = this.#routerInstance.find(req.method, pathname)
      if (routeResult && 'data' in routeResult && routeResult.data) {
        holder.routePattern = routeResult.data.pattern
        if ('params' in routeResult && routeResult.params) {
          for (const paramValue of Object.values(routeResult.params)) {
            if (paramValue.length > this.#maxParamLength) {
              return await ctx.handleError(
                414,
                new Deno.errors.InvalidData('Route parameter exceeds maximum allowed length')
              )
            }
          }
          Core.Context.internalOf(ctx).setParams(routeResult.params)
        }
        const handlerResult = await routeResult.data.handler(ctx)
        if (Routing.Respond.isGenuine(handlerResult)) {
          return Core.Context.internalOf(ctx).finalizeRaw(handlerResult)
        }
        return await ctx.handleError(
          500,
          new TypeError(`Route handler for ${pathname} must return a Response instance`)
        )
      }
      const supportedMethods = new Set<string>()
      for (const method of Core.Constant.httpMethods) {
        if (this.#routerInstance.find(method, pathname)) {
          supportedMethods.add(method)
        }
      }
      if (supportedMethods.has('GET')) {
        supportedMethods.add('HEAD')
      }
      if (supportedMethods.size > 0) {
        ctx.set.header('Allow', [...supportedMethods].sort().join(', '))
        return await ctx.handleError(
          405,
          new Deno.errors.NotSupported(`Method ${req.method} not allowed for ${pathname}`)
        )
      }
      const staticMount = this.#matchStatic(pathname)
      if (staticMount !== null) {
        const urlPath = Handler.#stripPrefix(staticMount.urlPrefix, pathname)
        return await staticMount.handler(ctx, urlPath)
      }
      return await ctx.handleError(
        404,
        new Deno.errors.NotFound(`No route found for ${req.method} ${pathname}`)
      )
    } catch (handlerError) {
      const extracted = Core.Handler.extractError(handlerError)
      return await ctx.handleError(extracted.statusCode, extracted.error)
    }
  }

  /**
   * Match pathname to static mount.
   * @description Returns first mount covering the pathname.
   * @param pathname - Request pathname to match
   * @returns Matching static mount or null
   */
  #matchStatic(pathname: string): Types.StaticMount | null {
    for (const mount of this.#staticMounts) {
      if (mount.urlPrefix === '/') {
        return mount
      }
      if (pathname === mount.urlPrefix || pathname.startsWith(`${mount.urlPrefix}/`)) {
        return mount
      }
    }
    return null
  }

  /**
   * Normalize static mount prefix.
   * @description Adds leading slash and trims trailing slashes.
   * @param prefix - Raw URL prefix to normalize
   * @returns Normalized URL prefix string
   */
  static #normalizePrefix(prefix: string): string {
    if (prefix === '' || prefix === '/') {
      return '/'
    }
    const withLeading = prefix.startsWith('/') ? prefix : `/${prefix}`
    return withLeading.replace(/\/+$/, '')
  }

  /**
   * Resolve numeric limit option.
   * @description Returns default or validated positive value.
   * @param inputValue - Provided option value or undefined
   * @param defaultValue - Fallback default value
   * @param optionName - Option name for error messages
   * @returns Resolved positive numeric limit
   */
  static #resolveLimit(
    inputValue: number | undefined,
    defaultValue: number,
    optionName: string
  ): number {
    return inputValue === undefined
      ? defaultValue
      : Core.Handler.assertPositiveFinite(inputValue, optionName)
  }

  /**
   * Strip mount prefix from pathname.
   * @description Returns remaining path after the prefix.
   * @param urlPrefix - Mount prefix to strip
   * @param pathname - Request pathname to trim
   * @returns Pathname without the mount prefix
   */
  static #stripPrefix(urlPrefix: string, pathname: string): string {
    if (urlPrefix === '/') {
      return pathname
    }
    return pathname.slice(urlPrefix.length)
  }

  /**
   * Handle request with timeout race.
   * @description Aborts and returns 503 on timeout.
   * @param req - Incoming request to handle
   * @param holder - Request state holder
   * @param clientIp - Resolved client IP address
   * @param directIp - Direct connection IP address
   * @returns Promise resolving to final response
   */
  async #withTimeout(
    req: Request,
    holder: Types.RequestHolder,
    clientIp: string | undefined,
    directIp: string | undefined
  ): Promise<Response> {
    const abortController = new AbortController()
    const timeoutTimer = setTimeout(() => abortController.abort(), this.#timeoutMs)
    try {
      return await Promise.race([
        this.#handleRequest(req, holder, clientIp, directIp),
        new Promise<Response>((resolve) => {
          abortController.signal.addEventListener('abort', () => {
            holder.frameworkError = new Deno.errors.TimedOut(
              `Request exceeded ${this.#timeoutMs}ms timeout`
            )
            resolve(Routing.Respond.negotiatedError(req, 503, 'Service Unavailable'))
          })
        })
      ])
    } finally {
      clearTimeout(timeoutTimer)
    }
  }
}
