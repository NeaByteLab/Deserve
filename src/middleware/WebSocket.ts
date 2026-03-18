import type * as Types from '@interfaces/index.ts'
import type * as Core from '@core/index.ts'
import * as Middleware from '@middleware/index.ts'

/**
 * WebSocket upgrade middleware.
 * @description Upgrades request on path; calls connect/message/close/error.
 */
export class WebSocket {
  /**
   * Create WebSocket upgrade middleware.
   * @description Upgrades request on path; runs connect/message/close/error.
   * @param options - Listener path and lifecycle callbacks
   * @returns Middleware that upgrades matching requests
   */
  static create(options: Types.WebSocketOptions = {}): Types.Middleware {
    const listener = options.listener ?? ''
    return Middleware.Utils.wrapMiddleware(
      'WebSocket upgrade failed',
      async (ctx: Core.Context, next) => {
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
      }
    )
  }
}
