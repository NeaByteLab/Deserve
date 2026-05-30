import type * as Core from '@core/index.ts'

/** WebSocket upgrade middleware options. */
export interface WebSocketOptions {
  /** Path prefix that triggers upgrade */
  readonly listener?: string
  /** Called when socket opens */
  readonly onConnect?: SocketCallback<Event>
  /** Called when socket closes */
  readonly onDisconnect?: SocketCallback<CloseEvent>
  /** Called on socket error */
  readonly onError?: SocketCallback<Event>
  /** Called on each message */
  readonly onMessage?: SocketCallback<MessageEvent>
}

/**
 * Socket lifecycle callback with event.
 * @description Handles WebSocket event with context access.
 * @template E - Event type, defaults to Event
 * @param socket - Active WebSocket connection
 * @param event - Fired event payload
 * @param ctx - Request context
 */
export type SocketCallback<E extends Event = Event> = (
  socket: WebSocket,
  event: E,
  ctx: Core.Context
) => void
