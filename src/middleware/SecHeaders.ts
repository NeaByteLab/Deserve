import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'
import * as Middleware from '@middleware/index.ts'

/**
 * Security headers middleware.
 * @description Sets configurable security headers on response.
 */
export class SecHeaders {
  /**
   * Create security headers middleware.
   * @description Sets secure defaults then applies overrides, false omits header.
   * @param options - Header values, false to omit a default
   * @returns Middleware that sets headers
   */
  static create(options: Types.SecurityHeadersOptions = {}): Types.MiddlewareFn {
    const resolvedHeaders: Types.StringPair[] = []
    for (const [key, name] of Object.entries(Core.Constant.securityHeaders)) {
      const headerValue = options[key as Types.SecurityHeaderKey]
      if (headerValue === false) {
        continue
      }
      if (headerValue !== undefined) {
        resolvedHeaders.push([name, headerValue])
      } else if (name in Core.Constant.securityHeaderDefaults) {
        resolvedHeaders.push([name, Core.Constant.securityHeaderDefaults[name]!])
      }
    }
    return Middleware.WrapMware('Security headers error', async (ctx, next) => {
      for (const [name, value] of resolvedHeaders) {
        ctx.setHeader(name, value)
      }
      return await next()
    })
  }
}
