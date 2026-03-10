import type * as Types from '@app/Types.ts'
import { Handler } from '@app/index.ts'

/**
 * Public API for routes, middleware, and serve.
 * @description Wraps Handler and exposes serve, use, static, catch.
 */
export class Router {
  private handler: Handler
  private routesDir: string

  /**
   * Create router with routes dir and options.
   * @description Sets Handler options and routes directory.
   * @param options - Routes dir, error builder, static handler, worker pool
   */
  constructor(options?: Types.RouterOptions) {
    const handlerOptions: Types.HandlerOptions = {}
    if (options?.errorResponseBuilder !== undefined) {
      handlerOptions.errorResponseBuilder = options.errorResponseBuilder
    }
    if (options?.staticHandler !== undefined) {
      handlerOptions.staticHandler = options.staticHandler
    }
    if (options?.requestTimeoutMs !== undefined) {
      handlerOptions.requestTimeoutMs = options.requestTimeoutMs
    }
    if (options?.worker !== undefined) {
      handlerOptions.worker = options.worker
    }
    this.handler = new Handler(Object.keys(handlerOptions).length > 0 ? handlerOptions : undefined)
    this.routesDir = options?.routesDir ?? './routes'
  }

  /**
   * Set error middleware for all errors.
   * @description Replaces or adds error handler before default response.
   * @param errorHandler - Function receiving ctx and error info
   */
  catch(errorHandler: Types.ErrorMiddleware): void {
    this.handler.setErrorMiddleware(errorHandler)
  }

  /**
   * Scan routes and start HTTP server.
   * @description Serves on port/host; optional AbortSignal for shutdown.
   * @param port - Port number; env PORT or 8000
   * @param hostname - Host; default 0.0.0.0
   * @param signal - Optional abort to stop server
   */
  async serve(port?: number): Promise<void>
  async serve(port?: number, hostname?: string): Promise<void>
  async serve(port?: number, hostname?: string, signal?: AbortSignal): Promise<void>
  async serve(port?: number, hostname?: string, signal?: AbortSignal): Promise<void> {
    await this.handler.scanRoutes(this.routesDir)
    const portNum = port ?? (Number(Deno.env.get('PORT')) || 8000)
    const resolvedHost = hostname ?? '0.0.0.0'
    if (signal) {
      await Deno.serve({
        port: portNum,
        hostname: resolvedHost,
        signal,
        handler: this.handler.createHandler()
      })
    } else {
      await Deno.serve({
        port: portNum,
        hostname: resolvedHost,
        handler: this.handler.createHandler()
      })
    }
  }

  /**
   * Register static route at URL path.
   * @description Serves files from options.path under urlPath.
   * @param urlPath - URL prefix for static files
   * @param options - Path, etag, cacheControl
   */
  static(urlPath: string, options: Types.ServeOptions): void {
    this.handler.addStaticRoute(urlPath, options)
  }

  /**
   * Add global or path-scoped middleware.
   * @description Use path string to scope middleware to path prefix.
   * @param pathOrMiddleware - Path prefix or first middleware
   * @param handlers - One or more middleware functions
   */
  use(...handlers: Types.Middleware[]): void
  use(path: string, ...handlers: Types.Middleware[]): void
  use(pathOrMiddleware: string | Types.Middleware, ...handlers: Types.Middleware[]): void {
    if (typeof pathOrMiddleware === 'string') {
      this.handler.addMiddleware(pathOrMiddleware, ...handlers)
    } else {
      this.handler.addMiddleware('', pathOrMiddleware, ...handlers)
    }
  }
}
