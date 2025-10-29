import type { Middleware } from '@app/Types.ts'
import { httpMethods } from '@app/Constant.ts'

/**
 * CORS configuration options
 */
export interface CorsOptions {
  /** Allowed origins (use '*' for all origins) */
  origin?: string | string[]
  /** Allowed HTTP methods */
  methods?: string[]
  /** Allowed headers */
  allowedHeaders?: string[]
  /** Exposed headers */
  exposedHeaders?: string[]
  /** Allow credentials */
  credentials?: boolean
  /** Max age for preflight requests */
  maxAge?: number
}

/**
 * Creates a CORS middleware.
 * @param options - CORS configuration options
 * @returns Middleware function
 */
export function cors(options: CorsOptions = {}): Middleware {
  const origin = options.origin ?? '*'
  const methods = options.methods ?? httpMethods
  const allowedHeaders = options.allowedHeaders ?? [
    'Content-Type',
    'Authorization',
    'X-Requested-With'
  ]
  const exposedHeaders = options.exposedHeaders ?? []
  const credentials = options.credentials ?? false
  const maxAge = options.maxAge ?? 86400
  return async (ctx, next) => {
    const requestOrigin = ctx.header('origin') as string | undefined
    if (!requestOrigin) {
      return await next()
    }
    let allowedOrigin: string | null = null
    if (origin === '*') {
      allowedOrigin = '*'
    } else if (Array.isArray(origin)) {
      if (origin.includes(requestOrigin)) {
        allowedOrigin = requestOrigin
      }
    } else {
      allowedOrigin = origin
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
  }
}
