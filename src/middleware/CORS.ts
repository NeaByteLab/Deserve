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
   * @description Handles preflight; sets Allow-Origin and related headers.
   * @param options - Origin, methods, headers, credentials, maxAge
   * @returns Middleware function
   */
  static create(options: Types.CorsOptions = {}): Types.Middleware {
    const origin = options.origin ?? '*'
    const methods = options.methods ?? Core.Constant.httpMethods
    const allowedHeaders = options.allowedHeaders ?? [
      'Content-Type',
      'Authorization',
      'X-Requested-With'
    ]
    const exposedHeaders = options.exposedHeaders ?? []
    const credentials = options.credentials ?? false
    const maxAge = options.maxAge ?? 86400
    return Middleware.Utils.wrapMiddleware('CORS error', async (ctx, next) => {
      const requestOrigin = ctx.header('origin')
      if (!requestOrigin) {
        return await next()
      }
      let allowedOrigin: string | null = null
      if (typeof origin === 'string') {
        allowedOrigin = origin
      } else if (origin.includes(requestOrigin)) {
        allowedOrigin = requestOrigin
      }
      if (ctx.request.method === 'OPTIONS') {
        if (allowedOrigin) {
          ctx.setHeader('Access-Control-Allow-Origin', allowedOrigin)
          ctx.setHeader('Access-Control-Allow-Methods', methods.join(', '))
          ctx.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(', '))
          ctx.setHeader('Access-Control-Max-Age', maxAge.toString())
          if (credentials && origin !== '*') {
            ctx.setHeader('Access-Control-Allow-Credentials', 'true')
          }
          if (exposedHeaders.length > 0) {
            ctx.setHeader('Access-Control-Expose-Headers', exposedHeaders.join(', '))
          }
          return ctx.send.custom(null, { status: 204 })
        }
        return ctx.send.custom(null, { status: 403 })
      }
      if (allowedOrigin) {
        ctx.setHeader('Access-Control-Allow-Origin', allowedOrigin)
        if (credentials && origin !== '*') {
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
