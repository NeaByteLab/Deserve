import type * as Core from '@core/index.ts'

/** WebSocket upgrade middleware options. */
export interface WebSocketOptions {
  /** Path prefix that triggers upgrade */
  listener?: string
  /** Called when socket opens */
  onConnect?: SocketCallback
  /** Called when socket closes */
  onDisconnect?: SocketEventCallback<CloseEvent>
  /** Called on socket error */
  onError?: SocketEventCallback
  /** Called on each message */
  onMessage?: SocketEventCallback<MessageEvent>
}

/** Socket callback with context. */
type SocketCallback = (socket: WebSocket, ctx: Core.Context) => void

/** Socket event callback with payload. */
type SocketEventCallback<E extends Event = Event> = (
  socket: WebSocket,
  event: E,
  ctx: Core.Context
) => void
