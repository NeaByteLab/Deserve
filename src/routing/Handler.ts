import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'
import * as Rendering from '@rendering/index.ts'
import * as Routing from '@routing/index.ts'
import { FastRouter } from '@neabyte/fast-router'

/**
 * Core request handler: middleware, routing, static.
 * @description Scans routes, runs middleware, dispatches to handler.
 */
export class Handler {
  /** Default error response builder using Error */
  private static readonly defaultErrorBuilder: Types.ErrorResponseBuilder = {
    build: (ctx, statusCode, error, errorMiddleware) =>
      Core.Handler.buildResponse(ctx, statusCode, error, errorMiddleware)
  }
  /** Default static file handler */
  private static readonly defaultStaticHandler: Types.StaticHandler = {
    serve: (ctx, options, urlPath) => Core.Static.serveStaticFile(ctx, options, urlPath)
  }
  /** Middleware list with path prefix */
  private entryMiddleware: Types.MiddlewareEntry[] = []
  /** Custom error handler when set */
  private errorMiddleware: Types.ErrorMiddleware | null = null
  /** Error response builder instance */
  private errorResponseBuilder: Types.ErrorResponseBuilder
  /** Fast router for route matching */
  private routerInstance = new FastRouter<Types.RouteEntry>()
  /** Max route param length */
  private maxParamLength: number | undefined
  /** Max request URL length */
  private maxUrlLength: number | undefined
  /** Request timeout in milliseconds */
  private requestTimeoutMs: number | undefined
  /** Compiled trusted-proxy tester or null */
  private trustTester: Types.IpMatcher | null
  /** Static file handler instance */
  private staticHandler: Types.StaticHandler
  /** Optional worker pool instance */
  private workerPool: Core.Worker | undefined
  /** Optional view engine instance */
  private viewEngine: Types.ViewEngine | undefined
  /** Lifecycle and error event bus */
  private readonly events = new Core.Observability()

  /**
   * Create handler with optional overrides.
   * @description Uses default builder and static handler when omitted.
   * @param options - Error builder, static handler, request timeout, worker pool
   */
  constructor(options?: Types.HandlerOptions) {
    this.errorResponseBuilder = options?.errorResponseBuilder ?? Handler.defaultErrorBuilder
    this.staticHandler = options?.staticHandler ?? Handler.defaultStaticHandler
    this.maxUrlLength = Handler.validatePositiveOption(
      options?.maxUrlLength,
      Core.Constant.maxUrlLength,
      'maxUrlLength'
    )
    this.maxParamLength = Handler.validatePositiveOption(
      options?.maxParamLength,
      Core.Constant.maxParamLength,
      'maxParamLength'
    )
    const timeoutValue = options?.requestTimeoutMs
    if (timeoutValue !== undefined) {
      Core.Handler.assertPositiveFinite(timeoutValue, 'requestTimeoutMs', 'milliseconds')
    }
    this.requestTimeoutMs = timeoutValue
    this.trustTester = Core.IpResolver.compile(options?.trustProxy)
    this.workerPool = options?.worker !== undefined
      ? Core.Worker.createPool({
        ...options.worker,
        emit: (event) => this.events.emit(event)
      })
      : undefined
    this.viewEngine = options?.viewsDir !== undefined
      ? new Rendering.Engine({
        viewsDir: options.viewsDir,
        emit: (event) => this.events.emit(event),
        ...(options.maxIterations !== undefined && { maxIterations: options.maxIterations }),
        ...(options.maxRenderIterations !== undefined && {
          maxRenderIterations: options.maxRenderIterations
        }),
        ...(options.maxOutputSize !== undefined && { maxOutputSize: options.maxOutputSize })
      })
      : undefined
  }

  /**
   * Register middleware for path or all.
   * @description Validates each handler then appends by prefix.
   * @param path - Path prefix, '', or '*'
   * @param handlers - Middleware functions
   * @throws {TypeError} When a handler is not a function
   */
  addMiddleware(path: string, ...handlers: Types.MiddlewareFn[]): void {
    for (const middlewareHandler of handlers) {
      if (typeof middlewareHandler !== 'function') {
        throw new TypeError(
          `Middleware for "${path || '*'}" must be a function, got ${typeof middlewareHandler}`
        )
      }
      this.entryMiddleware.push({ path, handler: middlewareHandler })
    }
  }

  /**
   * Register static file route for urlPath.
   * @description Registers static handler for all HTTP methods.
   * @param urlPath - URL prefix for static files
   * @param options - Path, etag, cacheControl
   */
  addStaticRoute(urlPath: string, options: Types.ServeOptions): void {
    if (typeof options?.path !== 'string' || options.path.length === 0) {
      throw new TypeError(
        `Static route "${urlPath}" requires a non-empty string "path" option, got ${typeof options
          ?.path}`
      )
    }
    const isAbsolute = options.path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(options.path)
    const resolvedPath = isAbsolute ? options.path : `${Deno.cwd()}/${options.path}`
    const resolvedOptions: Types.ServeOptions = options.path === resolvedPath
      ? options
      : { ...options, path: resolvedPath }
    const routePattern = urlPath === '/' ? '/**' : `${urlPath}/**`
    const routeEntry: Types.RouteEntry = {
      kind: 'static',
      execute: (ctx: Core.Context) => this.staticHandler.serve(ctx, resolvedOptions, urlPath),
      pattern: routePattern,
      urlPath
    }
    this.routerInstance.add('GET', routePattern, routeEntry)
  }

  /** Build Deno.serve request handler */
  createHandler(): (req: Request, info?: Deno.ServeHandlerInfo) => Promise<Response> {
    const eventReporter: Types.EventEmit = (event) => this.events.emit(event)
    const boundHandleResponse = this.handleResponse.bind(this)
    const workerPool = this.workerPool
    const workerHandle: Types.WorkerRunHandle | undefined = workerPool
      ? { run: <T>(payload: unknown) => workerPool.run<T>(payload) }
      : undefined
    const handleRequest = async (
      req: Request,
      holder: Types.RequestHolder,
      clientIp?: string,
      directIp?: string
    ): Promise<Response> => {
      if (
        this.maxUrlLength !== undefined &&
        this.maxUrlLength > 0 &&
        req.url.length > this.maxUrlLength
      ) {
        holder.frameworkError = new Deno.errors.InvalidData(
          'Request URL exceeds maximum allowed length'
        )
        return Routing.Respond.negotiatedError(req, 414, 'URI Too Long')
      }
      holder.parsedUrl = new Core.API.URL(req.url)
      holder.ctx = new Core.Context(
        req,
        holder.parsedUrl,
        undefined,
        boundHandleResponse,
        clientIp,
        directIp,
        (event) => this.events.emit(event)
      )
      if (workerHandle) {
        holder.ctx[Core.InternalContext].setInternalState(
          Core.Handler.stateKeys.worker,
          workerHandle
        )
      }
      if (this.viewEngine !== undefined) {
        holder.ctx[Core.InternalContext].setInternalState(
          Core.Handler.stateKeys.view,
          this.viewEngine
        )
      }
      try {
        if (this.entryMiddleware.length > 0) {
          const middlewareResult = await this.executeMiddlewares(
            holder.ctx,
            holder.parsedUrl.pathname
          )
          if (middlewareResult !== undefined) {
            return middlewareResult
          }
        }
        const routeResult = this.routerInstance.find(req.method, holder.parsedUrl.pathname)
        if (routeResult) {
          const routeEntry = 'data' in routeResult ? routeResult.data : null
          if (!routeEntry) {
            return await holder.ctx.handleError(
              404,
              new Deno.errors.NotFound('No route data found for matched pattern')
            )
          }
          holder.routePattern = routeEntry.pattern
          if ('params' in routeResult && routeResult.params) {
            if (this.maxParamLength !== undefined && this.maxParamLength > 0) {
              for (const paramValue of Object.values(routeResult.params)) {
                if (paramValue.length > this.maxParamLength) {
                  return await holder.ctx.handleError(
                    414,
                    new Deno.errors.InvalidData('Route parameter exceeds maximum allowed length')
                  )
                }
              }
            }
            holder.ctx[Core.InternalContext].setParams(routeResult.params)
          }
          if (routeEntry.kind === 'static') {
            return await routeEntry.execute(holder.ctx)
          }
          const handlerResult = await routeEntry.handler(holder.ctx)
          if (Routing.Respond.isGenuineResponse(handlerResult)) {
            return holder.ctx[Core.InternalContext].finalizeRaw(handlerResult)
          }
          return await holder.ctx.handleError(
            500,
            new TypeError(
              `Route handler for ${holder.parsedUrl.pathname} must return a Response instance`
            )
          )
        }
        const supportedMethods = new Set<string>()
        for (const method of Core.Constant.httpMethods) {
          if (this.routerInstance.find(method, holder.parsedUrl.pathname)) {
            supportedMethods.add(method)
          }
        }
        if (supportedMethods.has('GET')) {
          supportedMethods.add('HEAD')
        }
        if (supportedMethods.size > 0) {
          holder.ctx.setHeader('Allow', [...supportedMethods].sort().join(', '))
          return await holder.ctx.handleError(
            405,
            new Deno.errors.NotSupported(
              `Method ${req.method} not allowed for ${holder.parsedUrl.pathname}`
            )
          )
        }
        return await holder.ctx.handleError(
          404,
          new Deno.errors.NotFound(`No route found for ${req.method} ${holder.parsedUrl.pathname}`)
        )
      } catch (handlerError) {
        const extracted = Core.Handler.extractError(handlerError)
        return await holder.ctx.handleError(extracted.statusCode, extracted.error)
      }
    }
    return async (req: Request, info?: Deno.ServeHandlerInfo) => {
      const isHead = req.method === 'HEAD'
      if (isHead) {
        req = new Core.API.Request(req, { method: 'GET' })
      }
      const observe = this.events.hasListeners()
      const requestStart = observe ? performance.now() : 0
      const holder: Types.RequestHolder = {
        ctx: null,
        frameworkError: null,
        clientIp: undefined,
        routePattern: undefined,
        parsedUrl: undefined
      }
      const remoteAddr = info?.remoteAddr
      const directIp = remoteAddr && remoteAddr.transport === 'tcp'
        ? remoteAddr.hostname
        : undefined
      let timedOut = false
      let finalResponse: Response
      try {
        const clientIp = Core.IpResolver.resolve(directIp, req.headers, this.trustTester)
        holder.clientIp = clientIp
        if (this.requestTimeoutMs !== undefined && this.requestTimeoutMs > 0) {
          const abortController = new AbortController()
          const timeoutTimer = setTimeout(() => abortController.abort(), this.requestTimeoutMs)
          try {
            finalResponse = await Promise.race([
              handleRequest(req, holder, clientIp, directIp),
              new Promise<Response>((resolve) => {
                abortController.signal.addEventListener('abort', () => {
                  timedOut = true
                  holder.frameworkError = new Deno.errors.TimedOut(
                    `Request exceeded ${this.requestTimeoutMs}ms timeout`
                  )
                  resolve(Routing.Respond.negotiatedError(req, 503, 'Service Unavailable'))
                })
              })
            ])
          } finally {
            clearTimeout(timeoutTimer)
          }
        } else {
          finalResponse = await handleRequest(req, holder, clientIp, directIp)
        }
      } catch (fatalError) {
        holder.frameworkError = Core.Handler.extractError(fatalError).error
        finalResponse = Routing.Respond.safeServerError(req, 500)
      }
      if (!Routing.Respond.isGenuineResponse(finalResponse)) {
        holder.frameworkError = new TypeError('Response is not a genuine Response instance')
        finalResponse = Routing.Respond.safeServerError(req, 500)
      }
      try {
        if (observe) {
          Routing.Report.reportRequest(
            eventReporter,
            req,
            finalResponse,
            requestStart,
            holder,
            timedOut
          )
        }
        if (isHead) {
          return await Routing.Respond.toHeadResponse(finalResponse)
        }
        return finalResponse
      } catch {
        return Routing.Respond.safeServerError(req, 500)
      }
    }
  }

  /**
   * Convert file path to route pattern.
   * @description Drops extension, [id] to :id, index to /.
   * @param routePath - Path like users/[id].ts
   * @returns Pattern like /users/:id or null
   */
  createPattern(routePath: string): string | null {
    return Routing.Scanner.createPattern(routePath, Core.Constant.allowedExtensions)
  }

  /** Release framework-owned resources */
  dispose(): void {
    this.workerPool?.terminate()
    this.workerPool = undefined
  }

  /**
   * Emit lifecycle or error event.
   * @description Used by the router to surface server-level events.
   * @param event - Event payload to broadcast
   */
  emitEvent(event: Types.EventBase): void {
    this.events.emit(event)
  }

  /** View engine when viewsDir configured */
  getViewEngine(): Types.ViewEngine | undefined {
    return this.viewEngine
  }

  /**
   * Build error response via builder.
   * @description Delegates to errorResponseBuilder with optional middleware.
   * @param ctx - Request context
   * @param statusCode - HTTP status
   * @param error - Error instance
   * @returns Error response
   */
  async handleResponse(ctx: Core.Context, statusCode: number, error: Error): Promise<Response> {
    try {
      return await this.errorResponseBuilder.build(ctx, statusCode, error, this.errorMiddleware)
    } catch {
      return Core.Handler.errorResponse(ctx, statusCode)
    }
  }

  /**
   * Subscribe to lifecycle and error events.
   * @description Listener receives every Deserve event, filter via event.type.
   * @param listener - Callback invoked for each event
   * @returns Unsubscribe function
   */
  onEvent(listener: Types.EventListener): () => void {
    return this.events.on(listener)
  }

  /**
   * Reload a single route file.
   * @description Removes old route, re-imports module, registers new handlers.
   * @param fullPath - Absolute file path
   * @param routePath - Relative route path from routesDir
   */
  async reloadRoute(fullPath: string, routePath: string): Promise<void> {
    const routePattern = Routing.Scanner.createPattern(routePath, Core.Constant.allowedExtensions)
    if (!routePattern) {
      return
    }
    try {
      const fileModule = await Core.API.importRouteModule(fullPath, true)
      Routing.Scanner.validateModule(fileModule, routePath, Core.Constant.httpMethods)
      this.removeRoute(routePattern)
      Routing.Scanner.registerHandlers(
        this.routerInstance,
        fileModule,
        routePattern,
        Core.Constant.httpMethods
      )
      this.events.emit(
        Core.Observability.internalEvent('route:reloaded', { routePath, pattern: routePattern })
      )
    } catch (reloadError) {
      this.events.emit(
        Core.Observability.internalEvent('reload:error', {
          routePath,
          error: reloadError instanceof Error ? reloadError : new Error(String(reloadError))
        })
      )
    }
  }

  /**
   * Remove route pattern from router.
   * @description Removes all method entries, emits removed when path given.
   * @param routePattern - Route pattern to remove
   * @param routePath - Optional relative route path for the removal event
   */
  removeRoute(routePattern: string, routePath?: string): void {
    for (const method of Core.Constant.httpMethods) {
      this.routerInstance.remove(method, routePattern)
    }
    if (routePath !== undefined) {
      this.events.emit(
        Core.Observability.internalEvent('route:removed', { routePath, pattern: routePattern })
      )
    }
  }

  /**
   * Scan directory and register file-based routes.
   * @description Imports route modules and adds to router.
   * @param targetDir - Directory to scan
   * @param basePath - Base path prefix for route paths
   */
  async scanRoutes(targetDir: string, basePath = ''): Promise<void> {
    return await Routing.Scanner.explore(
      this.routerInstance,
      targetDir,
      basePath,
      Core.Constant.httpMethods,
      Core.Constant.allowedExtensions,
      (event) => this.events.emit(event)
    )
  }

  /**
   * Set custom error response builder.
   * @description Replaces default builder for error responses.
   * @param builder - Builds final error Response
   */
  setErrorBuilder(builder: Types.ErrorResponseBuilder): void {
    this.errorResponseBuilder = builder
  }

  /**
   * Set custom error middleware.
   * @description Invoked before default error response when set.
   * @param errorMiddleware - Called before default error response
   */
  setErrorMiddleware(errorMiddleware: Types.ErrorMiddleware): void {
    this.errorMiddleware = errorMiddleware
  }

  /**
   * Set custom static file handler.
   * @description Replaces default static file serving implementation.
   * @param handler - Serves static files for route
   */
  setStaticHandler(handler: Types.StaticHandler): void {
    this.staticHandler = handler
  }

  /**
   * Ensure module exports one HTTP method.
   * @description Delegates validation to Scanner with HTTP methods.
   * @param routeModule - Loaded route module
   * @param routePath - Path for error messages
   * @throws {Deno.errors.InvalidData} When no method exported
   */
  validateModule(routeModule: Types.RouteModule, routePath: string): void {
    Routing.Scanner.validateModule(routeModule, routePath, Core.Constant.httpMethods)
  }

  /**
   * Match middleware entry path against pathname.
   * @description Empty or star matches all, else boundary prefix match.
   * @param entryPath - Registered middleware path
   * @param pathname - Request pathname
   * @returns True when the entry applies to the pathname
   */
  private static entryMatchesPath(entryPath: string, pathname: string): boolean {
    if (entryPath === '' || entryPath === '*') {
      return true
    }
    if (entryPath.endsWith('/**')) {
      const prefix = entryPath.slice(0, -3)
      return pathname === prefix || pathname.startsWith(prefix + '/')
    }
    return pathname === entryPath || pathname.startsWith(entryPath + '/')
  }

  /**
   * Run middleware chain for pathname.
   * @description Filters by path then runs next chain.
   * @param ctx - Request context
   * @param pathname - Request pathname for path matching
   * @returns Response from middleware or undefined to continue
   */
  private async executeMiddlewares(
    ctx: Core.Context,
    pathname: string
  ): Types.AsyncMiddlewareResult {
    let lastIndex = -1
    const dispatch = async (index: number): Types.AsyncMiddlewareResult => {
      if (index <= lastIndex) {
        throw new Error('next() called multiple times')
      }
      lastIndex = index
      if (index >= this.entryMiddleware.length) {
        return undefined
      }
      const middlewareEntry = this.entryMiddleware[index]!
      if (!Handler.entryMatchesPath(middlewareEntry.path, pathname)) {
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
      if (Routing.Respond.isGenuineResponse(middlewareResponse)) {
        return middlewareResponse
      }
      throw new TypeError(
        `Middleware "${middlewareEntry.path || '*'}" must return a Response or undefined`
      )
    }
    return await dispatch(0)
  }

  /**
   * Validate optional positive-number construction option.
   * @description Returns default when omitted, throws on invalid value.
   * @param inputValue - Developer-provided value or undefined
   * @param defaultValue - Default used when omitted
   * @param optionName - Option name for the error message
   * @returns Validated positive number
   * @throws {Deno.errors.InvalidData} When an explicit value is non-positive or non-finite
   */
  private static validatePositiveOption(
    inputValue: number | undefined,
    defaultValue: number,
    optionName: string
  ): number {
    return inputValue === undefined
      ? defaultValue
      : Core.Handler.assertPositiveFinite(inputValue, optionName)
  }
}
