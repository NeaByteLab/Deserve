import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'
import * as Middleware from '@middleware/index.ts'

/**
 * WebSocket upgrade middleware.
 * @description Upgrades matching requests and binds lifecycle callbacks.
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
    return Middleware.Wrap.apply('websocket', async (ctx, next) => {
      if (!listener) {
        return await next()
      }
      if (ctx.get.header('upgrade')?.toLowerCase() !== 'websocket') {
        return await next()
      }
      if (ctx.get.method() !== 'GET') {
        return await next()
      }
      if (
        listener !== '/' &&
        ctx.get.pathname() !== listener &&
        !ctx.get.pathname().startsWith(`${listener}/`)
      ) {
        return await next()
      }
      if (!WebSocket.isOriginAllowed(ctx, allowedOrigins)) {
        Core.Context.internalOf(ctx).emitEvent(
          Core.Observability.internalEvent('websocket:rejected', { reason: 'origin' })
        )
        return await ctx.handleError(
          403,
          new Deno.errors.PermissionDenied(
            'WebSocket handshake rejected because the Origin is not allowed'
          )
        )
      }
      const version = ctx.get.header('sec-websocket-version')?.trim()
      if (version === undefined) {
        Core.Context.internalOf(ctx).emitEvent(
          Core.Observability.internalEvent('websocket:rejected', { reason: 'version' })
        )
        return await ctx.handleError(
          400,
          new Deno.errors.InvalidData('WebSocket handshake requires Sec-WebSocket-Version 13')
        )
      }
      if (version !== '13') {
        Core.Context.internalOf(ctx).emitEvent(
          Core.Observability.internalEvent('websocket:rejected', { reason: 'version' })
        )
        return ctx.send.custom(null, {
          status: 426,
          headers: { 'Sec-WebSocket-Version': '13', 'Upgrade': 'websocket' }
        })
      }
      let upgrade: ReturnType<typeof Deno.upgradeWebSocket>
      try {
        upgrade = Deno.upgradeWebSocket(ctx.get.request())
      } catch (upgradeError) {
        Core.Context.internalOf(ctx).emitEvent(
          Core.Observability.internalEvent('websocket:rejected', { reason: 'malformed' })
        )
        return await ctx.handleError(
          400,
          new Deno.errors.InvalidData(
            `WebSocket handshake is malformed because ${
              upgradeError instanceof Error ? upgradeError.message : String(upgradeError)
            }`
          )
        )
      }
      const socket = upgrade.socket
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
      return upgrade.response
    })
  }

  /**
   * Check whether handshake Origin is allowed.
   * @description Missing Origin passes only when no policy is configured.
   * @param ctx - Request context instance
   * @param allowedOrigins - Configured allowlist, wildcard, or undefined for same-origin
   * @returns True when the handshake may proceed
   */
  private static isOriginAllowed(
    ctx: Parameters<Types.MiddlewareFn>[0],
    allowedOrigins: readonly string[] | '*' | undefined
  ): boolean {
    const requestOrigin = ctx.get.header('origin')
    if (requestOrigin === undefined) {
      return allowedOrigins === undefined
    }
    if (allowedOrigins === '*') {
      return true
    }
    if (Array.isArray(allowedOrigins)) {
      return allowedOrigins.includes(requestOrigin)
    }
    try {
      return new Core.API.URL(ctx.get.request().url).origin === requestOrigin
    } catch {
      return false
    }
  }
}
