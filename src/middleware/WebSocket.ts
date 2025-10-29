import type { Middleware } from '@app/Types.ts'
import type { Context } from '@app/Context.ts'

/**
 * WebSocket middleware configuration options.
 */
export interface WebSocketOptions {
  /** Specific path to listen for WebSocket upgrades */
  listener?: string
  /** WebSocket connection handler */
  onConnect?: (socket: WebSocket, ctx: Context) => void
  /** WebSocket message handler */
  onMessage?: (socket: WebSocket, event: MessageEvent, ctx: Context) => void
  /** WebSocket disconnect handler */
  onDisconnect?: (socket: WebSocket, ctx: Context) => void
  /** WebSocket error handler */
  onError?: (socket: WebSocket, event: Event, ctx: Context) => void
}

/**
 * Creates a WebSocket middleware.
 * @param options - WebSocket configuration options
 * @returns Middleware function that handles WebSocket upgrades
 */
export function websocket(options: WebSocketOptions = {}): Middleware {
  const listener = options.listener ?? ''
  return async (ctx: Context, next) => {
    if (!listener) {
      return await next()
    }
    const upgradeHeader = ctx.header('upgrade')
    const upgradeValue = typeof upgradeHeader === 'string' ? upgradeHeader : undefined
    if (upgradeValue?.toLowerCase() !== 'websocket') {
      return await next()
    }
    if (!ctx.pathname.startsWith(listener)) {
      return await next()
    }
    try {
      const { socket, response } = Deno.upgradeWebSocket(ctx.request)
      socket.addEventListener('open', () => {
        options.onConnect?.(socket, ctx)
      })
      socket.addEventListener('message', (event) => {
        options.onMessage?.(socket, event, ctx)
      })
      socket.addEventListener('close', () => {
        options.onDisconnect?.(socket, ctx)
      })
      socket.addEventListener('error', (event) => {
        options.onError?.(socket, event, ctx)
      })
      return response
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`WebSocket upgrade failed: ${errorMessage}`)
    }
  }
}
