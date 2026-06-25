import type * as Types from '@interfaces/index.ts'
import { createSignal } from '@neabyte/utils-core'

/**
 * Event emitter and process guard.
 * @description Emits events and intercepts process termination.
 */
export class Observability {
  /** Internal signal carrying event payloads */
  readonly #signal = createSignal<[Types.EventBase]>()
  /** Active listener count for emit gating */
  #listenerCount = 0
  /** Cleanup function for process capture */
  #captureProcessErrors: (() => void) | null = null

  /**
   * Emit event to listeners.
   * @description Skips emit when no listeners exist.
   * @param event - Event payload to emit
   */
  emit(event: Types.EventBase): void {
    if (this.#listenerCount === 0) {
      return
    }
    this.#signal.emit(event)
  }

  /**
   * Build external event payload.
   * @description Stamps type external and current timestamp.
   * @param kind - Event kind discriminator
   * @param metadata - Event metadata for kind
   * @returns Typed external event payload
   * @template Kind - Event kind being built
   */
  static externalEvent<Kind extends Types.EventKind>(
    kind: Kind,
    metadata: Types.EventByKind<Kind>['metadata']
  ): Types.EventByKind<Kind> {
    return { type: 'external', kind, metadata, timestamp: Date.now() } as Types.EventByKind<Kind>
  }

  /** Check whether any listeners exist */
  hasListeners(): boolean {
    return this.#listenerCount > 0
  }

  /**
   * Build internal event payload.
   * @description Stamps type internal and current timestamp.
   * @param kind - Event kind discriminator
   * @param metadata - Event metadata for kind
   * @returns Typed internal event payload
   * @template Kind - Event kind being built
   */
  static internalEvent<Kind extends Types.EventKind>(
    kind: Kind,
    metadata: Types.EventByKind<Kind>['metadata']
  ): Types.EventByKind<Kind> {
    return { type: 'internal', kind, metadata, timestamp: Date.now() } as Types.EventByKind<Kind>
  }

  /**
   * Subscribe listener to events.
   * @description Installs process capture on first listener.
   * @param listener - Event listener callback
   * @returns Unsubscribe function for listener
   */
  on(listener: Types.EventFn): () => void {
    const unsubscribe = this.#signal.subscribe(listener)
    this.#listenerCount += 1
    if (this.#listenerCount === 1) {
      this.#captureProcessErrors = Observability.#installProcessCapture((event) => this.emit(event))
    }
    let active = true
    return () => {
      if (!active) {
        return
      }
      active = false
      this.#listenerCount -= 1
      unsubscribe()
      if (this.#listenerCount === 0 && this.#captureProcessErrors !== null) {
        this.#captureProcessErrors()
        this.#captureProcessErrors = null
      }
    }
  }

  /**
   * Install global process error capture.
   * @description Listens for rejections, errors, and exits.
   * @param emit - Event emitter for captured errors
   * @returns Cleanup function removing capture
   */
  static #installProcessCapture(emit: Types.EventFn): () => void {
    const onRejection = (event: PromiseRejectionEvent) => {
      event.preventDefault()
      emit(Observability.#processError('unhandledrejection', event.reason))
    }
    const onError = (event: ErrorEvent) => {
      event.preventDefault()
      emit(Observability.#processError('uncaughterror', event.error ?? event.message))
    }
    globalThis.addEventListener('unhandledrejection', onRejection)
    globalThis.addEventListener('error', onError)
    const restoreExits = Observability.#interposeExits(emit)
    return () => {
      globalThis.removeEventListener('unhandledrejection', onRejection)
      globalThis.removeEventListener('error', onError)
      restoreExits()
    }
  }

  /**
   * Interpose process exit methods.
   * @description Guards Deno and process termination methods.
   * @param emit - Event emitter for blocked calls
   * @returns Cleanup function restoring methods
   */
  static #interposeExits(emit: Types.EventFn): () => void {
    const ownPid = Deno.pid
    const targetsSelf = (args: readonly unknown[]): boolean => args[0] === ownPid
    const deno = Deno as unknown as Record<string, unknown>
    const proc = (globalThis as unknown as Types.ProcessGlobal).process
    const restores: Array<() => void> = []
    restores.push(Observability.#interposeMethod(emit, deno, 'exit', 'Deno.exit'))
    restores.push(Observability.#interposeMethod(emit, deno, 'kill', 'Deno.kill', targetsSelf))
    if (proc) {
      restores.push(Observability.#interposeMethod(emit, proc, 'exit', 'process.exit'))
      restores.push(Observability.#interposeMethod(emit, proc, 'abort', 'process.abort'))
      restores.push(Observability.#interposeMethod(emit, proc, 'reallyExit', 'process.reallyExit'))
      restores.push(Observability.#interposeMethod(emit, proc, 'kill', 'process.kill', targetsSelf))
    }
    return () => {
      for (const restore of restores) {
        restore()
      }
    }
  }

  /**
   * Replace target method with guard.
   * @description Blocks termination and emits process error.
   * @param emit - Event emitter for blocked calls
   * @param target - Object owning the method
   * @param name - Method name to interpose
   * @param label - Label used in error message
   * @param shouldBlock - Predicate deciding when to block
   * @returns Cleanup function restoring method
   */
  static #interposeMethod(
    emit: Types.EventFn,
    target: Record<string, unknown>,
    name: string,
    label: string,
    shouldBlock?: (args: readonly unknown[]) => boolean
  ): () => void {
    const original = target[name]
    if (typeof original !== 'function') {
      return () => {}
    }
    const realFn = original as (...args: unknown[]) => unknown
    const guarded = (...args: unknown[]): unknown => {
      if (shouldBlock && !shouldBlock(args)) {
        return realFn.apply(target, args)
      }
      emit(
        Observability.#processError(
          'process:exit',
          new Error(
            `Blocked ${label}(${
              args.map((value) => String(value)).join(', ')
            }) process termination is not permitted from application code`
          )
        )
      )
      return undefined
    }
    try {
      Object.defineProperty(target, name, { value: guarded, writable: true, configurable: true })
    } catch {
      return () => {}
    }
    return () => {
      try {
        Object.defineProperty(target, name, {
          value: realFn,
          writable: true,
          configurable: true
        })
      } catch {
        void 0
      }
    }
  }

  /**
   * Build process error event.
   * @description Wraps reason into error event payload.
   * @param origin - Process error origin label
   * @param reason - Underlying error reason value
   * @returns Process error event payload
   */
  static #processError(origin: Types.ProcessErrorOrigin, reason: unknown): Types.EventBase {
    const error = reason instanceof Error
      ? reason
      : new Error(typeof reason === 'string' ? reason : `Process error from ${String(reason)}`)
    return {
      type: 'external',
      kind: 'process:failed',
      metadata: { origin, error },
      timestamp: Date.now()
    }
  }
}
