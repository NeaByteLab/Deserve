import type { ServeDirOptions } from '@std/http/file-server'
import type { ErrorMiddleware, RouterMiddleware, RouterOptions } from '@app/Types.ts'
import { allowedExtensions } from '@app/Constant.ts'
import { middlewares } from '@middlewares/index.ts'
import { Handler } from '@app/Handler.ts'

/**
 * Native Deno.serve file-based router.
 * @description File-based routing with FastRouter matching and middleware support.
 */
export class Router {
  /** Handler instance for request processing */
  private handler: Handler
  /** Directory containing route files */
  private routesDir: string
  /** File extension for route files */
  private routesExt: string

  /**
   * Initialize router with configuration options.
   * @param options - Router configuration options
   * @throws {Error} When prefix or extension options are missing or invalid
   */
  constructor(options?: RouterOptions) {
    if (!options) {
      this.routesDir = './routes'
      this.routesExt = '.ts'
    } else {
      if (!options.prefix || !options.extension) {
        throw new Error('Router requires both prefix and extension options')
      } else {
        if (!allowedExtensions.includes(options.extension)) {
          throw new Error(`Invalid extension: ${options.extension}`)
        }
        this.routesDir = options.prefix.startsWith('/')
          ? options.prefix
          : `${Deno.cwd()}/${options.prefix}`
        this.routesExt = options.extension
      }
    }
    this.handler = new Handler(this.routesExt)
  }

  /**
   * Apply built-in middleware by name.
   * @param mwareConfig - Array of middleware names or [name, options] tuples
   */
  apply(mwareConfig: Array<string | [string, unknown]>): void {
    for (const config of mwareConfig) {
      if (typeof config === 'string') {
        const middleware = middlewares[config as keyof typeof middlewares]
        if (middleware) {
          this.handler.addMiddleware(middleware())
        }
      } else if (Array.isArray(config)) {
        const [name, options] = config
        const middleware = middlewares[name as keyof typeof middlewares]
        if (middleware) {
          this.handler.addMiddleware(
            middleware(options as unknown as Parameters<typeof middleware>[0])
          )
        }
      }
    }
  }

  /**
   * Set error middleware handler for custom error responses.
   * @param errorMiddleware - Error middleware function
   */
  onError(errorMiddleware: ErrorMiddleware): void {
    this.handler.setErrorMiddleware(errorMiddleware)
  }

  /**
   * Start server with file-based routing.
   * @param port - Port number to serve on (default: 8000)
   * @param hostname - Hostname to bind to (default: "0.0.0.0")
   * @param signal - Abort signal for server control
   */
  async serve(port?: number): Promise<void>
  async serve(port?: number, hostname?: string): Promise<void>
  async serve(port?: number, hostname?: string, signal?: AbortSignal): Promise<void>
  async serve(port?: number, hostname?: string, signal?: AbortSignal): Promise<void> {
    await this.handler.scanRoutes(this.routesDir)
    const actualPort = port ?? 8000
    const actualHostname = hostname ?? '0.0.0.0'
    if (signal) {
      Deno.serve({
        port: actualPort,
        hostname: actualHostname,
        signal,
        handler: this.handler.createHandler()
      })
    } else {
      Deno.serve({
        port: actualPort,
        hostname: actualHostname,
        handler: this.handler.createHandler()
      })
    }
  }

  /**
   * Serve static files from a directory.
   * @param urlPath - URL path to serve files from
   * @param options - Static file serving options
   */
  static(urlPath: string, options?: ServeDirOptions): void {
    this.handler.addStaticRoute(urlPath, options || {})
  }

  /**
   * Add global middleware to the pipeline.
   * @param middleware - Middleware function to execute before route handlers.
   */
  use(middleware: RouterMiddleware): void
  /**
   * Add route-specific middleware to the pipeline.
   * @param routePath - Route path pattern to apply middleware to
   * @param middleware - Middleware function to execute for matching routes
   */
  use(routePath: string, middleware: RouterMiddleware): void
  use(routePathOrMiddleware: string | RouterMiddleware, middleware?: RouterMiddleware): void {
    if (typeof routePathOrMiddleware === 'string' && middleware) {
      this.handler.addRouteSpecific(routePathOrMiddleware, middleware)
    } else if (typeof routePathOrMiddleware === 'function') {
      this.handler.addMiddleware(routePathOrMiddleware)
    } else {
      throw new Error('Invalid middleware configuration')
    }
  }
}
