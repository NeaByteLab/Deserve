import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'
import * as Middleware from '@middleware/index.ts'

/**
 * IP restriction middleware for access control.
 * @description Allows or denies requests by connection IP address.
 */
export class IP {
  /**
   * Create IP restriction middleware with options.
   * @description Whitelist takes precedence, then blacklist, fail-safe deny.
   * @param options - Allowed and denied IP rules
   * @returns Middleware function
   * @throws {Deno.errors.InvalidData} When a rule is malformed
   */
  static create(options: Types.IpOptions = {}): Types.MiddlewareFn {
    const whitelist = Core.IpAddress.compileRules(options.whitelist)
    const blacklist = Core.IpAddress.compileRules(options.blacklist)
    return Middleware.WrapMware('IP restriction error', async (ctx, next) => {
      const ip = ctx.ip
      if (ip === undefined) {
        return await IP.deny(ctx)
      }
      if (whitelist.length > 0) {
        if (Core.IpAddress.anyMatch(whitelist, ip)) {
          return await next()
        }
        return await IP.deny(ctx)
      }
      if (blacklist.length > 0 && Core.IpAddress.anyMatch(blacklist, ip)) {
        return await IP.deny(ctx)
      }
      return await next()
    })
  }

  /**
   * Deny the current request.
   * @description Sends a 403 permission denied response.
   * @param ctx - Request context instance
   * @returns Forbidden response
   */
  private static deny(ctx: Parameters<Types.MiddlewareFn>[0]): Types.AsyncMiddlewareResult {
    return ctx.handleError(
      403,
      new Deno.errors.PermissionDenied('Access denied by IP restriction')
    )
  }
}
