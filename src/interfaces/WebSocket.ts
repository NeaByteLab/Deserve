import type * as Core from '@core/index.ts'

/** WebSocket upgrade middleware options. */
export interface WebSocketOptions {
  /** Path prefix that triggers upgrade */
  listener?: string
  /** Called when socket opens */
  onConnect?: (socket: WebSocket, ctx: Core.Context) => void
  /** Called when socket closes */
  onDisconnect?: (socket: WebSocket, ctx: Core.Context) => void
  /** Called on socket error */
  onError?: (socket: WebSocket, event: Event, ctx: Core.Context) => void
  /** Called on each message */
  onMessage?: (socket: WebSocket, event: MessageEvent, ctx: Core.Context) => void
}
