import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'
import * as Rendering from '@rendering/index.ts'
import * as Routing from '@routing/index.ts'
import { Immutable } from '@neabyte/utils-core'

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
    Object.freeze(this)
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
   * Subscribe to lifecycle and error events.
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
    const watcherStops = this.startWatchers()
    const unregisterGuard = Core.Guard.register((event) => this.handler.emitEvent(event))
    const resolvedPort = port ?? (Number(Deno.env.get('PORT')) || 8000)
    const resolvedHost = hostname ?? '0.0.0.0'
    const handler = this.handler.createHandler()
    const onListen = (addr: Types.ListenAddr) => {
      this.handler.emitEvent(
        Core.Observability.internalEvent('server:listening', {
          port: addr.port,
          hostname: addr.hostname
        })
      )
    }
    const server = Deno.serve({ port: resolvedPort, hostname: resolvedHost, onListen, handler })
    const drain = () => {
      server.shutdown().catch(() => {})
    }
    const onSignal = signal ? null : drain
    if (signal) {
      signal.addEventListener('abort', drain, { once: true })
    } else {
      for (const name of Router.shutdownSignals()) {
        Deno.addSignalListener(name, drain)
      }
    }
    try {
      await server.finished
    } finally {
      if (signal) {
        signal.removeEventListener('abort', drain)
      } else if (onSignal) {
        for (const name of Router.shutdownSignals()) {
          Deno.removeSignalListener(name, onSignal)
        }
      }
      unregisterGuard()
      for (const stop of watcherStops) {
        stop()
      }
      this.handler.dispose()
      this.handler.emitEvent(Core.Observability.internalEvent('server:shutdown', {}))
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

  /** Signals that trigger graceful shutdown */
  private static shutdownSignals(): readonly Deno.Signal[] {
    if (Deno.build.os === 'windows') {
      return ['SIGINT']
    }
    return ['SIGINT', 'SIGTERM']
  }

  /** Start watchers for routes and templates */
  private startWatchers(): (() => void)[] {
    const stops: (() => void)[] = [Routing.Watcher.watch(this.handler, this.routesDir)]
    const viewEngine = this.handler.getViewEngine()
    if (viewEngine instanceof Rendering.Engine) {
      stops.push(Rendering.Watcher.watch(viewEngine))
    }
    return stops
  }
}

/** Freeze Router prototype methods */
Immutable.freeze(Router.prototype)
