import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'
import * as Middleware from '@middleware/index.ts'

/**
 * Security response headers middleware.
 * @description Applies configurable security headers to responses.
 */
export class SecurityHeaders {
  /**
   * Create security headers middleware.
   * @description Resolves header values from options and defaults.
   * @param options - Security headers configuration options
   * @returns Middleware function setting security headers
   */
  static create(options: Types.SecurityHeadersOptions = {}): Types.MiddlewareFn {
    const resolvedHeaders: Types.StringPair[] = []
    for (const optionKey of Object.keys(Core.Constant.securityHeaders)) {
      const entry = Core.Constant.securityHeaders[optionKey as Types.SecurityHeaderKey]
      const optionValue = options[optionKey as Types.SecurityHeaderKey]
      if (optionValue === false) {
        continue
      }
      if (optionValue !== undefined) {
        resolvedHeaders.push([entry.header, optionValue])
      } else if (entry.default !== null) {
        resolvedHeaders.push([entry.header, entry.default])
      }
    }
    return Middleware.Wrap.apply('securityHeaders', async (ctx, next) => {
      for (const [headerName, headerValue] of resolvedHeaders) {
        ctx.set.header(headerName, headerValue)
      }
      return await next()
    })
  }
}
