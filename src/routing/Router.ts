import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'
import * as Routing from '@routing/index.ts'
import { Immutable } from '@neabyte/utils-core'

/**
 * Public file-based router facade.
 * @description Configures middleware, statics, and serves requests.
 */
export class Router {
  /** Internal request handler instance */
  readonly #handler: Routing.Handler
  /** Whether hot reload is enabled */
  readonly #hotReload: boolean

  /**
   * Create router instance.
   * @description Builds handler and configures hot reload.
   * @param options - Optional router configuration
   */
  constructor(options?: Types.RouterOptions) {
    this.#handler = new Routing.Handler(options)
    this.#hotReload = options?.hotReload !== false
    Object.freeze(this)
  }

  /**
   * Register global error middleware.
   * @description Sets handler invoked on unhandled errors.
   * @param handler - Error middleware to register
   */
  catch(handler: Types.ErrorMiddleware): void {
    this.#handler.setErrorMiddleware(handler)
  }

  /**
   * Subscribe to router events.
   * @description Registers listener for emitted events.
   * @param listener - Event listener function
   * @returns Unsubscribe function removing the listener
   */
  on(listener: Types.EventFn): () => void {
    return this.#handler.onEvent(listener)
  }

  /**
   * Scan routes and start server.
   * @description Serves requests until shutdown or abort.
   * @param port - Optional port to listen on
   * @param hostname - Optional hostname to bind
   * @param signal - Optional abort signal for shutdown
   * @returns Promise resolving when server finishes
   */
  async serve(port?: number, hostname?: string, signal?: AbortSignal): Promise<void> {
    await this.#handler.scanRoutes()
    const disposeWatchers = this.#startWatchers()
    const resolvedPort = port ?? (Number(Deno.env.get('PORT')) || 8000)
    const resolvedHost = hostname ?? '0.0.0.0'
    const server = Deno.serve(
      { port: resolvedPort, hostname: resolvedHost },
      this.#handler.createHandler()
    )
    this.#handler.emitEvent(
      Core.Observability.internalEvent('server:started', {
        port: resolvedPort,
        hostname: resolvedHost
      })
    )
    const drain = () => {
      disposeWatchers()
      server.shutdown().catch(() => {})
    }
    const signalHandlers = new Map<Deno.Signal, () => void>()
    for (const name of Router.#shutdownSignals()) {
      const handler = () => {
        this.#handler.emitEvent(
          Core.Observability.externalEvent('process:failed', {
            origin: 'process:signal',
            error: new Error(`Received ${name} graceful shutdown initiated`)
          })
        )
        drain()
      }
      signalHandlers.set(name, handler)
      Deno.addSignalListener(name, handler)
    }
    if (signal) {
      signal.addEventListener('abort', drain, { once: true })
    }
    try {
      await server.finished
    } finally {
      disposeWatchers()
      this.#handler.terminate()
      this.#handler.emitEvent(Core.Observability.internalEvent('server:stopped', {}))
      for (const [name, handler] of signalHandlers) {
        Deno.removeSignalListener(name, handler)
      }
      if (signal) {
        signal.removeEventListener('abort', drain)
      }
    }
  }

  /**
   * Mount static file source.
   * @description Serves files under the given URL path.
   * @param urlPath - URL prefix to mount under
   * @param source - Static handler or serve options
   */
  static(urlPath: string, source: Types.StaticFn | Types.ServeOptions): void {
    this.#handler.addStatic(urlPath, source)
  }

  /**
   * Register path or global middleware.
   * @description Adds middleware scoped to path or all.
   * @param pathOrHandler - Path string or middleware function
   * @param handlers - Additional middleware functions
   * @throws {TypeError} When path given without middleware
   */
  use(pathOrHandler: string | Types.MiddlewareFn, ...handlers: Types.MiddlewareFn[]): void {
    if (typeof pathOrHandler === 'string') {
      if (handlers.length === 0) {
        throw new TypeError(`use("${pathOrHandler}") requires at least one middleware function`)
      }
      this.#handler.addMiddleware(pathOrHandler, handlers)
    } else {
      this.#handler.addMiddleware('', [pathOrHandler, ...handlers])
    }
  }

  /** Resolve platform shutdown signals */
  static #shutdownSignals(): readonly Deno.Signal[] {
    if (Deno.build.os === 'windows') {
      return ['SIGBREAK', 'SIGINT']
    }
    return ['SIGHUP', 'SIGINT', 'SIGTERM']
  }

  /** Start route and view watchers */
  #startWatchers(): () => void {
    if (!this.#hotReload) {
      return () => {}
    }
    const disposers = [Routing.Watcher.watch(this.#handler, this.#handler.routesDir)]
    const viewEngine = this.#handler.viewEngine
    if (viewEngine !== null) {
      disposers.push(Core.View.watch(viewEngine))
    }
    let disposed = false
    return () => {
      if (disposed) {
        return
      }
      disposed = true
      for (const dispose of disposers) {
        dispose()
      }
    }
  }
}

/** Freeze Router prototype to prevent mutation */
Immutable.freeze(Router.prototype)
