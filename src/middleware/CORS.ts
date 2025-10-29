import type { Middleware } from '@app/index.ts'
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
    try {
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
          return ctx.handleError(204, new Error('No Content'))
        }
        return ctx.handleError(403, new Error('Forbidden'))
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return ctx.handleError(500, new Error(`CORS error: ${errorMessage}`))
    }
  }
}
