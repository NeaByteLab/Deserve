import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'
import * as Middleware from '@middleware/index.ts'

/**
 * Cross-Site Request Forgery protection middleware.
 * @description Validates origin and sec-fetch-site headers.
 */
export class CSRF {
  /**
   * Create CSRF middleware.
   * @description Builds middleware blocking forged cross-site requests.
   * @param options - CSRF configuration options
   * @returns Middleware function enforcing CSRF protection
   */
  static create(options: Types.CsrfOptions = {}): Types.MiddlewareFn {
    const originRule = options.origin
    const secFetchRule = options.secFetchSite ?? ['same-origin']
    return Middleware.Wrap.apply('csrf', async (ctx, next) => {
      const method = ctx.get.method()
      if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
        return await next()
      }
      const allowedOrigin = originRule ?? new Core.API.URL(ctx.get.url().href).origin
      const requestOrigin = ctx.get.header('origin')
      const secFetchSite = ctx.get.header('sec-fetch-site')
      const isOriginValid = requestOrigin !== undefined &&
        CSRF.matchesRule(requestOrigin, allowedOrigin, 'origin', ctx)
      const isSecFetchValid = secFetchSite !== undefined &&
        CSRF.matchesRule(secFetchSite, secFetchRule, 'secFetchSite', ctx)
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
   * Test value against a CSRF rule.
   * @description Supports string, list, or predicate rules.
   * @param value - Header value being checked
   * @param rule - String, list, or predicate rule
   * @param ruleName - Rule name for error reporting
   * @param ctx - Request context for predicate rules
   * @returns True when value satisfies the rule
   */
  private static matchesRule(
    value: string,
    rule: string | readonly string[] | Types.CsrfRulePredicate,
    ruleName: Types.CsrfRuleName,
    ctx: Core.Context
  ): boolean {
    if (typeof rule === 'function') {
      try {
        return rule(value, ctx) === true
      } catch (ruleError) {
        Core.Context.internalOf(ctx).emitEvent(
          Core.Observability.internalEvent('csrf:failed', {
            rule: ruleName,
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
