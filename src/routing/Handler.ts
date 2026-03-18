import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'
import * as Rendering from '@rendering/index.ts'
import * as Routing from '@routing/index.ts'
import { FastRouter } from '@neabyte/fast-router'

/**
 * Core request handler: middleware, routing, static.
 * @description Scans routes, runs middleware chain, dispatches to route or static.
 */
export class Handler {
  /** Default error response builder using Error. */
  private static readonly defaultErrorResponseBuilder: Types.ErrorResponseBuilder = {
    build: (ctx, statusCode, error, errorMiddleware) =>
      Core.Error.buildResponse(ctx, statusCode, error, errorMiddleware)
  }
  /** Default static file handler using Static.serveStaticFile. */
  private static readonly defaultStaticHandler: Types.StaticHandler = {
    serve: (ctx, options, urlPath) => Core.Static.serveStaticFile(ctx, options, urlPath)
  }
  /** Middleware list with optional path prefix. */
  private entryMiddleware: Types.MiddlewareEntry[] = []
  /** Custom error handler or null when unset. */
  private errorMiddleware: Types.ErrorMiddleware | null = null
  /** Error response builder (default or custom). */
  private errorResponseBuilder: Types.ErrorResponseBuilder
  /** Fast router for route matching. */
  private routerInstance = new FastRouter<Types.RouteMetadata>()
  /** Request timeout in ms; 503 when exceeded when set. */
  private requestTimeoutMs: number | undefined
  /** Static file handler; default or custom. */
  private staticHandler: Types.StaticHandler
  /** Optional worker pool when worker option is set. */
  private workerPool: Core.Worker | undefined
  /** Optional view engine when viewsDir is set. */
  private viewEngine: Types.ViewEngine | undefined

  /**
   * Create handler with optional overrides.
   * @description Uses default builder and static handler when omitted.
   * @param options - Error builder, static handler, request timeout, worker pool
   */
  constructor(options?: Types.HandlerOptions) {
    this.errorResponseBuilder = options?.errorResponseBuilder ?? Handler.defaultErrorResponseBuilder
    this.staticHandler = options?.staticHandler ?? Handler.defaultStaticHandler
    this.requestTimeoutMs = options?.requestTimeoutMs
    this.workerPool = options?.worker !== undefined
      ? Core.Worker.createPool(options.worker)
      : undefined
    this.viewEngine = options?.viewsDir !== undefined
      ? new Rendering.Engine({ viewsDir: options.viewsDir })
      : undefined
  }

  /**
   * Register middleware for path prefix or all.
   * @description Appends middleware to list; path filters by prefix.
   * @param path - Path prefix, '', or '*'
   * @param handlers - Middleware functions
   */
  addMiddleware(path: string, ...handlers: Types.Middleware[]): void {
    for (const handler of handlers) {
      this.entryMiddleware.push({ path, handler })
    }
  }

  /**
   * Register static file route for urlPath.
   * @description Registers static handler for all HTTP methods.
   * @param urlPath - URL prefix for static files
   * @param options - Path, etag, cacheControl
   */
  addStaticRoute(urlPath: string, options: Types.ServeOptions): void {
    const staticHandler = this.staticHandler
    for (const method of Core.Constant.httpMethods) {
      const routePattern = urlPath === '/' ? '/**' : `${urlPath}/**`
      const metadata: Types.RouteMetadata = {
        handler: {
          staticRoute: true,
          urlPath,
          execute: (ctx: Core.Context) => staticHandler.serve(ctx, options, urlPath)
        },
        pattern: routePattern
      }
      this.routerInstance.add(method, routePattern, metadata)
    }
  }

  /**
   * Build Deno.serve request handler.
   * @description Middleware then route lookup then handler or 404.
   * @returns Async function from Request to Response
   */
  createHandler(): (req: Request) => Promise<Response> {
    const run = async (req: Request): Promise<Response> => {
      const url = new URL(req.url)
      const ctx = new Core.Context(req, url, {}, this.handleResponse.bind(this))
      if (this.workerPool) {
        ctx.state['worker'] = {
          run: <T>(payload: unknown) => this.workerPool!.run<T>(payload)
        } as Types.WorkerRunHandle
      }
      if (this.viewEngine !== undefined) {
        ctx.state['view'] = this.viewEngine
      }
      try {
        const middlewareResult = await this.executeMiddlewares(ctx, url.pathname)
        if (middlewareResult !== undefined) {
          return middlewareResult
        }
        const routeResult = this.routerInstance.find(req.method, url.pathname)
        if (routeResult) {
          const metadata = 'data' in routeResult ? routeResult.data : null
          if (!metadata) {
            return await ctx.handleError(404, new Error('Route not found'))
          }
          if ('params' in routeResult && routeResult.params) {
            ctx.setParams(routeResult.params)
          }
          const { handler } = metadata as Types.RouteMetadata
          if (
            handler &&
            typeof handler === 'object' &&
            'staticRoute' in handler &&
            handler.staticRoute
          ) {
            const staticHandler = handler as Types.StaticFileHandler
            return await staticHandler.execute(ctx)
          }
          try {
            return await (handler as Types.RouteHandler)(ctx)
          } catch (routeError) {
            const thrownError = routeError as Error & { statusCode?: number }
            return await ctx.handleError(thrownError.statusCode ?? 500, thrownError)
          }
        }
        return await ctx.handleError(404, new Error('Route not found'))
      } catch (handlerError) {
        const thrownError = handlerError as Error & { statusCode?: number }
        return await ctx.handleError(thrownError.statusCode ?? 500, thrownError)
      }
    }
    const timeoutMs = this.requestTimeoutMs
    return async (req: Request) => {
      if (timeoutMs !== undefined && timeoutMs > 0) {
        const timeoutResponse = new Promise<Response>((resolve) => {
          setTimeout(
            () => resolve(new Response(null, { status: 503, statusText: 'Service Unavailable' })),
            timeoutMs
          )
        })
        return await Promise.race([run(req), timeoutResponse])
      }
      return await run(req)
    }
  }

  /**
   * Convert file path to route pattern.
   * @description Drops extension; [id] to :id; index to /.
   * @param routePath - Path like users/[id].ts
   * @returns Pattern like /users/:id or null
   */
  createPattern(routePath: string): string | null {
    return Routing.Scanner.createPattern(routePath, Core.Constant.allowedExtensions)
  }

  /**
   * Build error response via builder and middleware.
   * @description Delegates to errorResponseBuilder with optional middleware.
   * @param ctx - Request context
   * @param statusCode - HTTP status
   * @param error - Error instance
   * @returns Error response
   */
  async handleResponse(ctx: Core.Context, statusCode: number, error: Error): Promise<Response> {
    return await this.errorResponseBuilder.build(ctx, statusCode, error, this.errorMiddleware)
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
      Core.Constant.allowedExtensions
    )
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
   * Set custom error response builder.
   * @description Replaces default builder for error responses.
   * @param builder - Builds final error Response
   */
  setErrorResponseBuilder(builder: Types.ErrorResponseBuilder): void {
    this.errorResponseBuilder = builder
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
   * @param module - Loaded route module
   * @param routePath - Path for error messages
   * @throws {Error} When no method exported or handler not function
   */
  validateModule(module: Record<string, unknown>, routePath: string): void {
    Routing.Scanner.validateModule(module, routePath, Core.Constant.httpMethods)
  }

  /**
   * Run middleware chain for pathname.
   * @description Filters by path then runs next chain; returns first response.
   * @param ctx - Request context
   * @param pathname - Request pathname for path matching
   * @returns Response from middleware or undefined to continue
   */
  private async executeMiddlewares(
    ctx: Core.Context,
    pathname: string
  ): Promise<Response | undefined> {
    const applicableMiddlewares = this.entryMiddleware.filter((middlewareEntry) => {
      if (middlewareEntry.path === '' || middlewareEntry.path === '*') {
        return true
      }
      if (middlewareEntry.path.endsWith('/**')) {
        const pathPrefix = middlewareEntry.path.slice(0, -3)
        return pathname.startsWith(pathPrefix)
      }
      return pathname === middlewareEntry.path || pathname.startsWith(middlewareEntry.path + '/')
    })
    let middlewareIndex = 0
    const next = async (): Promise<Response | undefined> => {
      if (middlewareIndex >= applicableMiddlewares.length) {
        return undefined
      }
      const middleware = applicableMiddlewares[middlewareIndex]
      if (!middleware) {
        return undefined
      }
      middlewareIndex++
      const middlewareResponse = await middleware.handler(ctx, next)
      if (middlewareResponse !== undefined) {
        return middlewareResponse
      }
      return next()
    }
    return await next()
  }
}
