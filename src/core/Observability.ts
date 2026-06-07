import type * as Types from '@interfaces/index.ts'
import { createSignal } from '@neabyte/utils-core'

/**
 * Central lifecycle and error event bus.
 * @description Wraps a typed signal isolating faulty subscriber errors.
 */
export class Observability {
  /** Underlying typed signal carrying Deserve events */
  private readonly signal = createSignal<[Types.EventBase]>()

  /**
   * Emit one event to listeners.
   * @description No-op when there are no subscribers.
   * @param event - Event payload to broadcast
   */
  emit(event: Types.EventBase): void {
    this.signal.emit(event)
  }

  /**
   * Subscribe to every Deserve event.
   * @description Listener receives all event types, filter via type.
   * @param listener - Callback invoked for each event
   * @returns Unsubscribe function
   */
  on(listener: Types.EventListener): () => void {
    return this.signal.subscribe(listener)
  }
}
