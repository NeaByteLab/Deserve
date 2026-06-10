import type * as Types from '@interfaces/index.ts'
import type * as CoreTypes from '@core/index.ts'
import * as Core from '@core/index.ts'
import * as Middleware from '@middleware/index.ts'

/**
 * CSRF middleware for state-changing requests.
 * @description Verifies Origin and Sec-Fetch-Site headers, denies by default.
 */
export class CSRF {
  /**
   * Create CSRF middleware with options.
   * @description Validates unsafe methods via Origin or Sec-Fetch-Site.
   * @param options - Allowed origin and sec-fetch-site rules
   * @returns Middleware function
   */
  static create(options: Types.CsrfOptions = {}): Types.MiddlewareFn {
    const originRule = options.origin
    const secFetchRule = options.secFetchSite ?? ['same-origin']
    return Middleware.WrapMware('CSRF error', async (ctx, next) => {
      const method = ctx.request.method
      if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
        return await next()
      }
      const allowedOrigin = originRule ?? new Core.API.URL(ctx.request.url).origin
      const origin = ctx.header('origin')
      const secFetchSite = ctx.header('sec-fetch-site')
      const isOriginValid = origin !== undefined &&
        CSRF.matches(origin, allowedOrigin, ctx, 'origin')
      const isSecFetchValid = secFetchSite !== undefined &&
        CSRF.matches(secFetchSite, secFetchRule, ctx, 'secFetchSite')
      if (isOriginValid || isSecFetchValid) {
        return await next()
      }
      return await ctx.handleError(
        403,
        new Deno.errors.PermissionDenied('Request blocked by CSRF protection')
      )
    })
  }

  /**
   * Check header value against allow rule.
   * @description Supports exact string, string list, or predicate function.
   * @param value - Incoming header value
   * @param rule - Allowed string, list, or predicate
   * @param ctx - Request context instance
   * @param ruleLabel - Rule identifier for error events
   * @returns True when the value is allowed
   */
  private static matches(
    value: string,
    rule: string | readonly string[] | Types.CsrfRulePredicate,
    ctx: CoreTypes.Context,
    ruleLabel: 'origin' | 'secFetchSite'
  ): boolean {
    if (typeof rule === 'function') {
      try {
        return rule(value, ctx) === true
      } catch (ruleError) {
        ctx[Core.InternalContext].emitEvent(
          Core.Observability.internalEvent('csrf:rule-error', {
            rule: ruleLabel,
            error: ruleError instanceof Error ? ruleError : new Error(String(ruleError))
          })
        )
        return false
      }
    }
    if (typeof rule === 'string') {
      return value === rule
    }
    return rule.includes(value)
  }
}
