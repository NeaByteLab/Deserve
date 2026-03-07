import type { Context, Middleware, Types } from '@app/index.ts'
import MwareUtils from '@app/middleware/Utils.ts'

/**
 * WebSocket upgrade middleware.
 * @description Upgrades request on path; calls connect/message/close/error.
 */
export default class WebSocket {
  /**
   * Create WebSocket upgrade middleware.
   * @description Upgrades request on path; runs connect/message/close/error.
   * @param options - Listener path and lifecycle callbacks
   * @returns Middleware that upgrades matching requests
   */
  static create(options: Types.WebSocketOptions = {}): Middleware {
    const listener = options.listener ?? ''
    return MwareUtils.wrapMiddleware('WebSocket upgrade failed', async (ctx: Context, next) => {
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
    })
  }
}
