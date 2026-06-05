import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'
import * as Middleware from '@middleware/index.ts'

/**
 * CORS middleware for cross-origin requests.
 * @description Handles preflight and sets Allow-Origin and related headers.
 */
export class Cors {
  /**
   * Create CORS middleware with options.
   * @description Handles preflight, sets Allow-Origin and related headers.
   * @param options - Origin, methods, headers, credentials, maxAge
   * @returns Middleware function
   */
  static create(options: Types.CorsOptions = {}): Types.Middleware {
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
        'CORS credentials cannot be used with wildcard origin "*", specify explicit origin(s)'
      )
    }
    const hasVaryOrigin = allowedOrigins !== '*'
    return Middleware.Utils.wrapMiddleware('CORS error', async (ctx, next) => {
      const requestOrigin = ctx.header('origin')
      if (!requestOrigin) {
        return await next()
      }
      let matchedOrigin: string | null = null
      if (typeof allowedOrigins === 'string') {
        matchedOrigin = allowedOrigins
      } else if (allowedOrigins.includes(requestOrigin)) {
        matchedOrigin = requestOrigin
      }
      if (ctx.request.method === 'OPTIONS') {
        if (hasVaryOrigin) {
          ctx.setHeader('Vary', 'Origin')
        }
        if (matchedOrigin) {
          ctx.setHeader('Access-Control-Allow-Origin', matchedOrigin)
          ctx.setHeader('Access-Control-Allow-Methods', methods.join(', '))
          ctx.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(', '))
          ctx.setHeader('Access-Control-Max-Age', maxAge.toString())
          if (credentials) {
            ctx.setHeader('Access-Control-Allow-Credentials', 'true')
          }
          if (exposedHeaders.length > 0) {
            ctx.setHeader('Access-Control-Expose-Headers', exposedHeaders.join(', '))
          }
          return ctx.send.custom(null, { status: 204 })
        }
        return ctx.send.custom(null, { status: 403 })
      }
      if (hasVaryOrigin) {
        ctx.setHeader('Vary', 'Origin')
      }
      if (matchedOrigin) {
        ctx.setHeader('Access-Control-Allow-Origin', matchedOrigin)
        if (credentials) {
          ctx.setHeader('Access-Control-Allow-Credentials', 'true')
        }
        if (exposedHeaders.length > 0) {
          ctx.setHeader('Access-Control-Expose-Headers', exposedHeaders.join(', '))
        }
      }
      return await next()
    })
  }
}
