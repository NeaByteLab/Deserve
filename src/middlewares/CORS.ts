import type { DeserveRequest } from '@app/Request.ts'
import type { RouterMiddleware } from '@app/Types.ts'
import { httpMethods } from '@app/Constant.ts'

/**
 * CORS middleware configuration options.
 */
export interface CorsOptions {
  /** Allowed origins for CORS requests */
  origin?: string | string[]
  /** Allowed HTTP methods for CORS requests */
  methods?: string[]
  /** Allowed headers for CORS requests */
  headers?: string[]
  /** Maximum age for preflight requests in seconds */
  maxAge?: number
  /** Whether to allow credentials in CORS requests */
  credentials?: boolean
}

/**
 * CORS middleware factory function.
 * @param options - CORS configuration options
 * @returns Middleware function that handles CORS headers
 */
export default function corsMiddleware(options?: CorsOptions): RouterMiddleware {
  return (req: Request | DeserveRequest, res?: Response) => {
    const origin = options?.origin ?? '*'
    const methods = options?.methods ?? httpMethods
    const headers = options?.headers ?? ['Content-Type', 'Authorization']
    const maxAge = options?.maxAge ?? 86400
    const credentials = options?.credentials ?? false
    const corsHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': Array.isArray(origin) ? origin.join(', ') : origin,
      'Access-Control-Allow-Methods': methods.join(', '),
      'Access-Control-Allow-Headers': headers.join(', ')
    }
    if (credentials) {
      corsHeaders['Access-Control-Allow-Credentials'] = 'true'
    }
    if (req.method === 'OPTIONS') {
      corsHeaders['Access-Control-Max-Age'] = maxAge.toString()
      return new Response(null, {
        status: 200,
        headers: corsHeaders
      })
    }
    if (res) {
      const newHeaders = new Headers(res.headers)
      Object.entries(corsHeaders).forEach(([key, value]) => {
        newHeaders.set(key, value)
      })
      return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers: newHeaders
      })
    }
    return null
  }
}
