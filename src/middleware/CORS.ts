import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'
import * as Middleware from '@middleware/index.ts'

/**
 * Cross-Origin Resource Sharing middleware.
 * @description Sets CORS headers and handles preflight requests.
 */
export class CORS {
  /**
   * Create CORS middleware.
   * @description Builds middleware applying configured CORS policy.
   * @param options - CORS configuration options
   * @returns Middleware function applying CORS headers
   * @throws {Deno.errors.InvalidData} When credentials used with wildcard origin
   */
  static create(options: Types.CorsOptions = {}): Types.MiddlewareFn {
    const allowedOrigins = options.origin ?? '*'
    const methods = options.methods ?? Core.Constant.httpMethods
    const allowedHeaders = options.allowedHeaders ?? [
      'Content-Type',
      'Authorization',
      'X-Requested-With'
    ]
    const exposedHeaders = options.exposedHeaders ?? []
    const credentials = options.credentials ?? false
    const maxAge = options.maxAge ?? 86400
    if (credentials && allowedOrigins === '*') {
      throw new Deno.errors.InvalidData(
        'CORS credentials cannot be used with wildcard origin "*", specify explicit origins'
      )
    }
    const varyOrigin = allowedOrigins !== '*'
    const methodsHeader = methods.join(', ')
    const headersHeader = allowedHeaders.join(', ')
    const maxAgeHeader = maxAge.toString()
    const exposedHeader = exposedHeaders.length > 0 ? exposedHeaders.join(', ') : null
    return Middleware.Wrap.apply('cors', async (ctx, next) => {
      const requestOrigin = ctx.get.header('origin')
      if (requestOrigin === undefined) {
        return await next()
      }
      const matchedOrigin = CORS.matchOrigin(allowedOrigins, requestOrigin)
      if (varyOrigin) {
        ctx.set.header('Vary', 'Origin')
      }
      if (ctx.get.method() === 'OPTIONS') {
        if (matchedOrigin !== null) {
          ctx.set.header('Access-Control-Allow-Origin', matchedOrigin)
          ctx.set.header('Access-Control-Allow-Methods', methodsHeader)
          ctx.set.header('Access-Control-Allow-Headers', headersHeader)
          ctx.set.header('Access-Control-Max-Age', maxAgeHeader)
          if (credentials) {
            ctx.set.header('Access-Control-Allow-Credentials', 'true')
          }
          if (exposedHeader !== null) {
            ctx.set.header('Access-Control-Expose-Headers', exposedHeader)
          }
        } else {
          Core.Context.internalOf(ctx).emitEvent(
            Core.Observability.internalEvent('cors:blocked', { origin: requestOrigin })
          )
        }
        return ctx.send.empty(204)
      }
      if (matchedOrigin !== null) {
        ctx.set.header('Access-Control-Allow-Origin', matchedOrigin)
        if (credentials) {
          ctx.set.header('Access-Control-Allow-Credentials', 'true')
        }
        if (exposedHeader !== null) {
          ctx.set.header('Access-Control-Expose-Headers', exposedHeader)
        }
      } else {
        Core.Context.internalOf(ctx).emitEvent(
          Core.Observability.internalEvent('cors:blocked', { origin: requestOrigin })
        )
      }
      return await next()
    })
  }

  /**
   * Match request origin against allowed set.
   * @description Returns matched origin value or null.
   * @param allowedOrigins - Allowed origin or origin list
   * @param requestOrigin - Origin from incoming request
   * @returns Matched origin string or null
   */
  private static matchOrigin(
    allowedOrigins: string | readonly string[],
    requestOrigin: string
  ): string | null {
    if (allowedOrigins === '*') {
      return '*'
    }
    if (typeof allowedOrigins === 'string') {
      return allowedOrigins === requestOrigin ? requestOrigin : null
    }
    return allowedOrigins.includes(requestOrigin) ? requestOrigin : null
  }
}
