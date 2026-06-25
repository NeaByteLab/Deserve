import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'
import * as Middleware from '@middleware/index.ts'

/**
 * IP address filtering middleware.
 * @description Allows or denies requests by client IP.
 */
export class IP {
  /**
   * Create IP filter middleware.
   * @description Builds middleware applying whitelist and blacklist.
   * @param options - IP filter configuration options
   * @returns Middleware function enforcing IP rules
   */
  static create(options: Types.IpOptions = {}): Types.MiddlewareFn {
    const whitelist = Core.IpAddress.compileRules(options.whitelist)
    const blacklist = Core.IpAddress.compileRules(options.blacklist)
    return Middleware.Wrap.apply('ip', async (ctx, next) => {
      const clientIp = ctx.get.ip()
      if (clientIp === undefined) {
        Core.Context.internalOf(ctx).emitEvent(
          Core.Observability.internalEvent('ip:denied', { ip: 'unknown' })
        )
        return await IP.deny(ctx)
      }
      if (whitelist.length > 0) {
        if (Core.IpAddress.anyMatch(whitelist, clientIp)) {
          return await next()
        }
        Core.Context.internalOf(ctx).emitEvent(
          Core.Observability.internalEvent('ip:denied', { ip: clientIp })
        )
        return await IP.deny(ctx)
      }
      if (blacklist.length > 0 && Core.IpAddress.anyMatch(blacklist, clientIp)) {
        Core.Context.internalOf(ctx).emitEvent(
          Core.Observability.internalEvent('ip:denied', { ip: clientIp })
        )
        return await IP.deny(ctx)
      }
      return await next()
    })
  }

  /**
   * Deny request with forbidden response.
   * @description Routes denial through context error handler.
   * @param ctx - Request context to handle denial
   * @returns Promise resolving to forbidden response
   */
  private static deny(ctx: Parameters<Types.MiddlewareFn>[0]): Promise<Response> {
    return ctx.handleError(403, new Deno.errors.PermissionDenied('Access denied by IP restriction'))
  }
}
