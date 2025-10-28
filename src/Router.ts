import type { ServeDirOptions } from '@std/http/file-server'
import type { ErrorMiddleware, Middleware, RouterOptions } from '@app/Types.ts'
import { Handler } from '@app/Handler.ts'

/**
 * Router class.
 * @description Main entry point for the routing system.
 */
export class Router {
  /** The handler instance. */
  private handler: Handler
  /** The routes directory. */
  private routesDir: string

  /**
   * Creates a new router instance.
   * @param options - Optional router configuration
   * @throws {Error} When options are invalid or extension not allowed
   */
  constructor(options?: RouterOptions) {
    if (!options) {
      this.routesDir = './routes'
    } else {
      if (!options.routesDir) {
        throw new Error(
          'Router requires `routesDir` option, which is the directory containing the route files.'
        )
      }
      this.routesDir = options.routesDir.startsWith('/')
        ? options.routesDir
        : `${Deno.cwd()}/${options.routesDir}`
    }
    this.handler = new Handler()
  }

  /**
   * Sets the error handling middleware.
   * @param errorHandler - Error handling function
   */
  catch(errorHandler: ErrorMiddleware): void {
    this.handler.setErrorMiddleware(errorHandler)
  }

  /**
   * Starts the server and begins listening for requests.
   * @param port - Port number (default: 8000)
   * @param hostname - Hostname (default: '0.0.0.0')
   * @param signal - Abort signal for graceful shutdown
   */
  async serve(port?: number): Promise<void>
  async serve(port?: number, hostname?: string): Promise<void>
  async serve(port?: number, hostname?: string, signal?: AbortSignal): Promise<void>
  async serve(port?: number, hostname?: string, signal?: AbortSignal): Promise<void> {
    await this.handler.scanRoutes(this.routesDir)
    if (signal) {
      await Deno.serve({
        port: port ?? 8000,
        hostname: hostname ?? '0.0.0.0',
        signal,
        handler: this.handler.createHandler()
      })
    } else {
      await Deno.serve({
        port: port ?? 8000,
        hostname: hostname ?? '0.0.0.0',
        handler: this.handler.createHandler()
      })
    }
  }

  /**
   * Registers middleware.
   * @param path - Path pattern or middleware function(s)
   * @param handlers - Middleware functions
   */
  use(...handlers: Middleware[]): void
  use(path: string, ...handlers: Middleware[]): void
  use(pathOrMiddleware: string | Middleware, ...handlers: Middleware[]): void {
    if (typeof pathOrMiddleware === 'string') {
      this.handler.addMiddleware(pathOrMiddleware, ...handlers)
    } else {
      this.handler.addMiddleware('', pathOrMiddleware, ...handlers)
    }
  }

  /**
   * Registers a static file serving route.
   * @param urlPath - URL path to serve static files from
   * @param options - Static file serving options
   */
  static(urlPath: string, options?: ServeDirOptions): void {
    this.handler.addStaticRoute(urlPath, options || {})
  }
}
