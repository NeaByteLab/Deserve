import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'
import * as Rendering from '@rendering/index.ts'
import * as Routing from '@routing/index.ts'

/**
 * Public API for routes and middleware.
 * @description Wraps Handler and exposes serve, use, static, catch.
 */
export class Router {
  /** Wrapped Handler instance */
  private handler: Routing.Handler
  /** Directory path for file-based routes */
  private routesDir: string

  /**
   * Create router with routes and options.
   * @description Sets Handler options and routes directory.
   * @param options - Routes dir, error builder, static handler, worker pool
   */
  constructor(options?: Types.RouterOptions) {
    this.handler = new Routing.Handler(options)
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
   * Subscribe to all lifecycle and error events.
   * @description Listener receives every event, filter via event.type.
   * @param listener - Callback invoked for each event
   * @returns Unsubscribe function
   */
  on(listener: Types.EventListener): () => void {
    return this.handler.onEvent(listener)
  }

  /**
   * Scan routes and start HTTP server.
   * @description Serves on port/host, optional AbortSignal for shutdown.
   * @param port - Port number, env PORT or 8000
   * @param hostname - Host, default 0.0.0.0
   * @param signal - Optional abort to stop server
   */
  async serve(port?: number): Promise<void>
  async serve(port?: number, hostname?: string): Promise<void>
  async serve(port?: number, hostname?: string, signal?: AbortSignal): Promise<void>
  async serve(port?: number, hostname?: string, signal?: AbortSignal): Promise<void> {
    await this.handler.scanRoutes(this.routesDir)
    this.startWatchers()
    const unregisterGuard = Core.Guard.register((event) => this.handler.emitEvent(event))
    if (signal) {
      signal.addEventListener('abort', unregisterGuard, { once: true })
    }
    const resolvedPort = port ?? (Number(Deno.env.get('PORT')) || 8000)
    const resolvedHost = hostname ?? '0.0.0.0'
    const handler = this.handler.createHandler()
    const onListen = (addr: Types.ListenAddr) => {
      this.handler.emitEvent({
        type: 'internal',
        kind: 'server:listening',
        metadata: { port: addr.port, hostname: addr.hostname },
        timestamp: Date.now()
      })
    }
    if (signal) {
      await Deno.serve({ port: resolvedPort, hostname: resolvedHost, signal, onListen, handler })
    } else {
      await Deno.serve({ port: resolvedPort, hostname: resolvedHost, onListen, handler })
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
   * @description Scopes middleware to path prefix when string given.
   * @param pathOrMiddleware - Path prefix or first middleware
   * @param handlers - One or more middleware functions
   */
  use(...handlers: Types.MiddlewareFn[]): void
  use(path: string, ...handlers: Types.MiddlewareFn[]): void
  use(pathOrMiddleware: string | Types.MiddlewareFn, ...handlers: Types.MiddlewareFn[]): void {
    if (typeof pathOrMiddleware === 'string') {
      if (handlers.length === 0) {
        throw new TypeError(
          `use("${pathOrMiddleware}") requires at least one middleware function`
        )
      }
      this.handler.addMiddleware(pathOrMiddleware, ...handlers)
    } else {
      this.handler.addMiddleware('', pathOrMiddleware, ...handlers)
    }
  }

  /** Start watchers for routes and templates */
  private startWatchers(): void {
    Routing.Watcher.watch(this.handler, this.routesDir)
    const viewEngine = this.handler.getViewEngine()
    if (viewEngine instanceof Rendering.Engine) {
      Rendering.Watcher.watch(viewEngine)
    }
  }
}
