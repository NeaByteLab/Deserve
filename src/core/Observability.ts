import type * as Types from '@interfaces/index.ts'
import { createSignal } from '@neabyte/utils-core'

/**
 * Central lifecycle and error event bus.
 * @description Wraps a typed signal isolating faulty subscriber errors.
 */
export class Observability {
  /** Underlying typed signal carrying Deserve events */
  private readonly signal = createSignal<[Types.EventBase]>()
  /** Active subscriber count */
  private listeners = 0

  /**
   * Emit one event to listeners.
   * @description No-op when there are no subscribers.
   * @param event - Event payload to broadcast
   */
  emit(event: Types.EventBase): void {
    if (this.listeners === 0) {
      return
    }
    this.signal.emit(event)
  }

  /** Report whether any subscriber is registered */
  hasListeners(): boolean {
    return this.listeners > 0
  }

  /**
   * Build an internal lifecycle event.
   * @description Stamps type internal and current timestamp.
   * @template Kind - Event kind discriminant literal
   * @param kind - Event kind discriminant
   * @param metadata - Metadata matching the kind
   * @returns Fully formed internal event
   */
  static internalEvent<Kind extends Types.EventKind>(
    kind: Kind,
    metadata: Types.EventByKind<Kind>['metadata']
  ): Types.EventByKind<Kind> {
    return { type: 'internal', kind, metadata, timestamp: Date.now() } as Types.EventByKind<Kind>
  }

  /**
   * Subscribe to every Deserve event.
   * @description Listener receives all event types, filter via type.
   * @param listener - Callback invoked for each event
   * @returns Unsubscribe function
   */
  on(listener: Types.EventListener): () => void {
    const unsubscribe = this.signal.subscribe(listener)
    this.listeners += 1
    let active = true
    return () => {
      if (!active) {
        return
      }
      active = false
      this.listeners -= 1
      unsubscribe()
    }
  }
}
