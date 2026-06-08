import type * as Types from '@interfaces/index.ts'
import type * as CoreTypes from '@core/index.ts'
import * as Core from '@core/index.ts'
import * as Middleware from '@middleware/index.ts'

/**
 * WebSocket upgrade middleware.
 * @description Upgrades request on path, calls connect/message/close/error.
 */
export class WebSocket {
  /**
   * Create WebSocket upgrade middleware.
   * @description Upgrades matching GET requests into WebSockets.
   * @param options - Listener path and lifecycle callbacks
   * @returns Middleware that upgrades matching requests
   */
  static create(options: Types.WebSocketOptions = {}): Types.MiddlewareFn {
    const rawListener = options.listener ?? ''
    const listener = rawListener.length > 1 ? rawListener.replace(/\/+$/, '') : rawListener
    const allowedOrigins = options.allowedOrigins
    return Middleware.WrapMware(
      'WebSocket upgrade failed',
      async (ctx: CoreTypes.Context, next) => {
        if (!listener) {
          return await next()
        }
        if (ctx.header('upgrade')?.toLowerCase() !== 'websocket') {
          return await next()
        }
        if (ctx.request.method !== 'GET') {
          return await next()
        }
        if (
          listener !== '/' &&
          ctx.pathname !== listener &&
          !ctx.pathname.startsWith(listener + '/')
        ) {
          return await next()
        }
        if (!WebSocket.isOriginAllowed(ctx, allowedOrigins)) {
          return await ctx.handleError(
            403,
            new Deno.errors.PermissionDenied(
              'WebSocket handshake rejected because the Origin is not allowed'
            )
          )
        }
        let upgrade: ReturnType<typeof Deno.upgradeWebSocket>
        try {
          upgrade = Deno.upgradeWebSocket(ctx.request)
        } catch (upgradeError) {
          return await ctx.handleError(
            400,
            new Deno.errors.InvalidData(
              `WebSocket handshake is malformed because ${
                upgradeError instanceof Error ? upgradeError.message : String(upgradeError)
              }`
            )
          )
        }
        const { socket, response } = upgrade
        socket.addEventListener('open', (event) => {
          options.onConnect?.(socket, event, ctx)
        })
        socket.addEventListener('message', (event) => {
          options.onMessage?.(socket, event, ctx)
        })
        socket.addEventListener('close', (event) => {
          options.onDisconnect?.(socket, event, ctx)
        })
        socket.addEventListener('error', (event) => {
          options.onError?.(socket, event, ctx)
        })
        return response
      }
    )
  }

  /**
   * Decide whether handshake Origin is allowed.
   * @description Validates Origin header to prevent CSWSH attacks.
   * @param ctx - Request context
   * @param allowedOrigins - Configured allowlist, '*', or undefined for same-origin
   * @returns True when the handshake may proceed
   */
  private static isOriginAllowed(
    ctx: CoreTypes.Context,
    allowedOrigins: readonly string[] | '*' | undefined
  ): boolean {
    const requestOrigin = ctx.header('origin')
    if (!requestOrigin) {
      return true
    }
    if (allowedOrigins === '*') {
      return true
    }
    if (Array.isArray(allowedOrigins)) {
      return allowedOrigins.includes(requestOrigin)
    }
    try {
      return new Core.API.URL(ctx.request.url).origin === requestOrigin
    } catch {
      return false
    }
  }
}
