import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'
import * as Rendering from '@rendering/index.ts'
import * as Routing from '@routing/index.ts'
import { FastRouter } from '@neabyte/fast-router'
import nodeUrl from 'node:url'

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
    if (
      timeoutValue !== undefined &&
      (!Number.isFinite(timeoutValue) || timeoutValue <= 0)
    ) {
      throw new Deno.errors.InvalidData(
        `requestTimeoutMs must be a positive finite number of milliseconds, got ${timeoutValue}`
      )
    }
    this.requestTimeoutMs = timeoutValue
    this.workerPool = options?.worker !== undefined
      ? Core.Worker.createPool(options.worker)
      : undefined
    this.viewEngine = options?.viewsDir !== undefined
      ? new Rendering.Engine({
        viewsDir: options.viewsDir,
        emit: (event) => this.events.emit(event),
        ...(options.maxIterations !== undefined && { maxIterations: options.maxIterations })
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
    const staticHandler = this.staticHandler
    const isAbsolute = options.path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(options.path)
    const resolvedPath = isAbsolute ? options.path : `${Deno.cwd()}/${options.path}`
    const resolvedOptions: Types.ServeOptions = options.path === resolvedPath
      ? options
      : { ...options, path: resolvedPath }
    const routePattern = urlPath === '/' ? '/**' : `${urlPath}/**`
    const routeEntry: Types.RouteEntry = {
      kind: 'static',
      execute: (ctx: Core.Context) => staticHandler.serve(ctx, resolvedOptions, urlPath),
      pattern: routePattern,
      urlPath
    }
    this.routerInstance.add('GET', routePattern, routeEntry)
  }

  /** Build Deno.serve request handler */
  createHandler(): (req: Request) => Promise<Response> {
    const maxUrlLength = this.maxUrlLength
    const maxParamLength = this.maxParamLength
    const boundHandleResponse = this.handleResponse.bind(this)
    const eventReporter: Types.EventEmit = (event) => this.events.emit(event)
    const router = this.routerInstance
    const methods = Core.Constant.httpMethods
    const workerPool = this.workerPool
    const viewEngine = this.viewEngine
    const workerHandle: Types.WorkerRunHandle | undefined = workerPool
      ? { run: <T>(payload: unknown) => workerPool.run<T>(payload) }
      : undefined
    const handleRequest = async (
      req: Request,
      holder: Types.RequestHolder
    ): Promise<Response> => {
      if (maxUrlLength !== undefined && maxUrlLength > 0 && req.url.length > maxUrlLength) {
        holder.frameworkError = new Deno.errors.InvalidData(
          'Request URL exceeds maximum allowed length'
        )
        return Handler.buildUriError(req)
      }
      const requestUrl = new URL(req.url)
      const ctx = new Core.Context(req, requestUrl, {}, boundHandleResponse)
      holder.ctx = ctx
      if (workerHandle) {
        ctx.setState(Core.Handler.StateKeys.worker, workerHandle)
      }
      if (viewEngine !== undefined) {
        ctx.setState(Core.Handler.StateKeys.view, viewEngine)
      }
      try {
        const middlewareResult = await this.executeMiddlewares(ctx, requestUrl.pathname)
        if (middlewareResult !== undefined) {
          return middlewareResult
        }
        let routeResult = router.find(req.method, requestUrl.pathname)
        if (!routeResult && req.method === 'HEAD') {
          routeResult = router.find('GET', requestUrl.pathname)
        }
        if (routeResult) {
          const routeEntry = 'data' in routeResult ? routeResult.data : null
          if (!routeEntry) {
            return await ctx.handleError(
              404,
              new Deno.errors.NotFound('No route data found for matched pattern')
            )
          }
          if ('params' in routeResult && routeResult.params) {
            if (maxParamLength !== undefined && maxParamLength > 0) {
              for (const paramValue of Object.values(routeResult.params)) {
                if (paramValue.length > maxParamLength) {
                  return await ctx.handleError(
                    414,
                    new Deno.errors.InvalidData('Route parameter exceeds maximum allowed length')
                  )
                }
              }
            }
            ctx.setParams(routeResult.params)
          }
          if (routeEntry.kind === 'static') {
            return await routeEntry.execute(ctx)
          }
          try {
            const handlerResult = await routeEntry.handler(ctx)
            if (handlerResult instanceof Response) {
              return handlerResult
            }
            return await ctx.handleError(
              500,
              new TypeError(
                `Route handler for ${requestUrl.pathname} must return a Response instance`
              )
            )
          } catch (routeError) {
            const extracted = Core.Handler.extractError(routeError)
            return await ctx.handleError(extracted.statusCode, extracted.error)
          }
        }
        const allowedMethods: string[] = []
        for (const method of methods) {
          if (method !== req.method && router.find(method, requestUrl.pathname)) {
            allowedMethods.push(method)
          }
        }
        if (allowedMethods.length > 0) {
          if (req.method === 'HEAD') {
            allowedMethods.push('HEAD')
          }
          ctx.setHeader('Allow', allowedMethods.join(', '))
          return await ctx.handleError(
            405,
            new Deno.errors.NotSupported(
              `Method ${req.method} not allowed for ${requestUrl.pathname}`
            )
          )
        }
        return await ctx.handleError(
          404,
          new Deno.errors.NotFound(`No route found for ${req.method} ${requestUrl.pathname}`)
        )
      } catch (handlerError) {
        const extracted = Core.Handler.extractError(handlerError)
        return await ctx.handleError(extracted.statusCode, extracted.error)
      }
    }
    const timeoutMs = this.requestTimeoutMs
    return async (req: Request) => {
      const requestStart = performance.now()
      const holder: Types.RequestHolder = {
        ctx: null,
        frameworkError: null
      }
      let timedOut = false
      let finalResponse: Response
      if (timeoutMs !== undefined && timeoutMs > 0) {
        const abortController = new AbortController()
        const timeoutTimer = setTimeout(() => abortController.abort(), timeoutMs)
        try {
          finalResponse = await Promise.race([
            handleRequest(req, holder),
            new Promise<Response>((resolve) => {
              abortController.signal.addEventListener('abort', () => {
                timedOut = true
                holder.frameworkError = new Deno.errors.TimedOut(
                  `Request exceeded ${timeoutMs}ms timeout`
                )
                resolve(
                  new Response(null, {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: Core.Constant.securityHeaderDefaults
                  })
                )
              })
            })
          ])
        } finally {
          clearTimeout(timeoutTimer)
        }
      } else {
        finalResponse = await handleRequest(req, holder)
      }
      Handler.reportRequest(eventReporter, req, finalResponse, requestStart, holder, timedOut)
      if (req.method === 'HEAD') {
        const headHeaders = new Headers(finalResponse.headers)
        if (finalResponse.body) {
          await finalResponse.body.cancel()
        }
        return new Response(null, {
          status: finalResponse.status,
          statusText: finalResponse.statusText,
          headers: headHeaders
        })
      }
      return finalResponse
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

  /**
   * Emit a lifecycle or error event on the shared bus.
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
   * Subscribe to all lifecycle and error events.
   * @description Listener receives every Deserve event; filter via event.type.
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
    this.removeRoute(routePattern)
    try {
      const importUrl = `${nodeUrl.pathToFileURL(fullPath).href}?t=${Date.now()}`
      const fileModule = (await import(importUrl)) as Types.RouteModule
      Routing.Scanner.validateModule(fileModule, routePath, Core.Constant.httpMethods)
      Routing.Scanner.registerHandlers(
        this.routerInstance,
        fileModule,
        routePattern,
        Core.Constant.httpMethods
      )
      this.events.emit({
        type: 'internal',
        kind: 'route:reloaded',
        metadata: { routePath, pattern: routePattern },
        timestamp: Date.now()
      })
    } catch (reloadError) {
      this.events.emit({
        type: 'internal',
        kind: 'reload:error',
        metadata: {
          routePath,
          error: reloadError instanceof Error ? reloadError : new Error(String(reloadError))
        },
        timestamp: Date.now()
      })
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
      this.events.emit({
        type: 'internal',
        kind: 'route:removed',
        metadata: { routePath, pattern: routePattern },
        timestamp: Date.now()
      })
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
   * Build 414 response with security headers.
   * @description Returns JSON or HTML by Accept header.
   * @param req - Incoming request
   * @returns 414 Response with minimal security headers
   */
  private static buildUriError(req: Request): Response {
    const statusCode = 414
    const errorLabel = 'URI Too Long'
    const secHeaders = Core.Constant.securityHeaderDefaults
    const isJsonRequest = req.headers.get('accept')?.includes('application/json')
    if (isJsonRequest) {
      return globalThis.Response.json(
        { error: errorLabel, path: '', statusCode },
        { status: statusCode, headers: { 'Content-Type': 'application/json', ...secHeaders } }
      )
    }
    return new Response(Core.Handler.defaultErrorHtml(statusCode, errorLabel), {
      status: statusCode,
      headers: { 'Content-Type': 'text/html; charset=utf-8', ...secHeaders }
    })
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
    const entries = this.entryMiddleware
    const entryCount = entries.length
    let middlewareIndex = 0
    const next: Types.NextFn = async () => {
      while (middlewareIndex < entryCount) {
        const middlewareEntry = entries[middlewareIndex]!
        middlewareIndex++
        const entryPath = middlewareEntry.path
        if (entryPath !== '' && entryPath !== '*') {
          if (entryPath.endsWith('/**')) {
            const prefix = entryPath.slice(0, -3)
            if (pathname !== prefix && !pathname.startsWith(prefix + '/')) {
              continue
            }
          } else if (pathname !== entryPath && !pathname.startsWith(entryPath + '/')) {
            continue
          }
        }
        const middlewareResponse = await middlewareEntry.handler(ctx, next)
        if (middlewareResponse === undefined) {
          continue
        }
        if (middlewareResponse instanceof Response) {
          return middlewareResponse
        }
        throw new TypeError(
          `Middleware "${middlewareEntry.path || '*'}" must return a Response or undefined`
        )
      }
      return undefined
    }
    return await next()
  }

  /**
   * Emit boundary observability for a completed request.
   * @description Emits request:complete plus request:error when status exceeds.
   * @param emit - Event reporter
   * @param req - Incoming request
   * @param response - Final response sent to the client
   * @param startTime - performance.now() captured at request entry
   * @param holder - Per-request holder with ctx and any framework Error
   * @param timedOut - True when the response is the synthetic 503 timeout
   */
  private static reportRequest(
    emit: Types.EventEmit,
    req: Request,
    response: Response,
    startTime: number,
    holder: Types.RequestHolder,
    timedOut: boolean
  ): void {
    const frameworkSourced = timedOut || holder.frameworkError !== null ||
      (holder.ctx?.hasFrameworkError() ?? false) || holder.ctx === null
    const channel: Types.EventChannel = frameworkSourced ? 'internal' : 'external'
    const frameworkError = holder.frameworkError ?? holder.ctx?.getFrameworkError() ?? null
    const durationMs = performance.now() - startTime
    const baseMetadata = {
      method: req.method,
      statusCode: response.status,
      url: req.url,
      durationMs,
      ...(frameworkError !== null && { error: frameworkError })
    }
    emit({
      type: channel,
      kind: 'request:complete',
      metadata: baseMetadata,
      timestamp: Date.now()
    })
    if (response.status >= 400) {
      emit({
        type: channel,
        kind: 'request:error',
        metadata: baseMetadata,
        timestamp: Date.now()
      })
    }
  }

  /**
   * Validate an optional positive-number option at construction time.
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
    if (inputValue === undefined) {
      return defaultValue
    }
    if (!Number.isFinite(inputValue) || inputValue <= 0) {
      throw new Deno.errors.InvalidData(
        `${optionName} must be a positive finite number, got ${inputValue}`
      )
    }
    return inputValue
  }
}
