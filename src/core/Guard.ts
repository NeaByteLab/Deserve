import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'

/**
 * Process-level fault sentinel for multi-service uptime.
 * @description Traps unhandled rejections and uncaught errors process-wide.
 */
export class Guard {
  /** Registered emitters, one per serving Router */
  private static readonly emitters = new Set<Types.EventEmit>()
  /** True once the global listeners have been attached */
  private static installed = false

  /**
   * Register a Router emitter and activate guard.
   * @description Attaches global listeners exactly once across routers.
   * @param emit - The Router's observability emit function
   * @returns Unregister function removing this emitter from the fan-out
   */
  static register(emit: Types.EventEmit): () => void {
    Guard.emitters.add(emit)
    Guard.install()
    return () => {
      Guard.emitters.delete(emit)
    }
  }

  /**
   * Fan a fault to registered emitters.
   * @description A faulty subscriber must not break delivery to the others.
   * @param origin - Which global hook produced the fault
   * @param error - Normalized Error describing the fault
   */
  private static dispatch(
    origin: 'unhandledrejection' | 'uncaughterror' | 'process:exit',
    error: Error
  ): void {
    for (const emit of Guard.emitters) {
      try {
        emit(Core.Observability.internalEvent('process:error', { origin, error }))
      } catch {
        void 0
      }
    }
  }

  /** Attach global rejection and error listeners once */
  private static install(): void {
    if (Guard.installed) {
      return
    }
    Guard.installed = true
    globalThis.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      event.preventDefault()
      Guard.dispatch('unhandledrejection', Guard.toError(event.reason))
    })
    globalThis.addEventListener('error', (event: ErrorEvent) => {
      event.preventDefault()
      Guard.dispatch('uncaughterror', Guard.toError(event.error ?? event.message))
    })
    Guard.interposeExitCapabilities()
  }

  /**
   * Neutralize every native process-termination capability.
   * @description Blocks exit, abort, and self-targeted kills.
   */
  private static interposeExitCapabilities(): void {
    const ownPid = Deno.pid
    const targetsSelf = (args: readonly unknown[]): boolean => args[0] === ownPid
    const deno = Deno as unknown as Record<string, unknown>
    Guard.interposeMethod(deno, 'exit', 'Deno.exit')
    Guard.interposeMethod(deno, 'kill', 'Deno.kill', targetsSelf)
    const proc = (globalThis as unknown as { process?: Record<string, unknown> }).process
    if (proc) {
      Guard.interposeMethod(proc, 'exit', 'process.exit')
      Guard.interposeMethod(proc, 'abort', 'process.abort')
      Guard.interposeMethod(proc, 'reallyExit', 'process.reallyExit')
      Guard.interposeMethod(proc, 'kill', 'process.kill', targetsSelf)
    }
  }

  /**
   * Replace one termination method with a guarded no-op.
   * @description Predicate-matched calls block, others delegate through.
   * @param target - Object owning the method (Deno or node process)
   * @param name - Method name to interpose
   * @param label - Human-readable name for the blocked capability
   * @param shouldBlock - Optional guard; when omitted every call is blocked
   */
  private static interposeMethod(
    target: Record<string, unknown>,
    name: string,
    label: string,
    shouldBlock?: (args: readonly unknown[]) => boolean
  ): void {
    const original = target[name]
    if (typeof original !== 'function') {
      return
    }
    const realFn = original as (...args: unknown[]) => unknown
    const guarded = (...args: unknown[]): unknown => {
      if (shouldBlock && !shouldBlock(args)) {
        return realFn.apply(target, args)
      }
      Guard.dispatch(
        'process:exit',
        new Error(
          `Blocked ${label}(${
            args.map((value) => String(value)).join(', ')
          }) — process termination is not permitted from application code`
        )
      )
      return undefined
    }
    try {
      Object.defineProperty(target, name, {
        value: guarded,
        writable: true,
        configurable: true
      })
    } catch {
      void 0
    }
  }

  /**
   * Normalize a thrown value into Error.
   * @description Wraps non-Error reasons into a real Error.
   * @param reason - The rejection reason or thrown value
   * @returns A normalized Error instance
   */
  private static toError(reason: unknown): Error {
    if (reason instanceof Error) {
      return reason
    }
    return new Error(
      typeof reason === 'string' ? reason : `Unhandled rejection caused by ${String(reason)}`
    )
  }
}
