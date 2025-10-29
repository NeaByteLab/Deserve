import type { Middleware } from '@app/index.ts'

/**
 * Body limit configuration options
 */
export interface BodyLimitOptions {
  /** Maximum body size in bytes */
  limit: number
}

/**
 * Creates a body limit middleware.
 * @param options - Body limit configuration options
 * @returns Middleware function
 */
export function bodyLimit(options: BodyLimitOptions): Middleware {
  const maxSize = options.limit ?? 1024 * 1024
  return async (ctx, next) => {
    try {
      if (ctx.request.method === 'GET' || ctx.request.method === 'HEAD') {
        return await next()
      }
      const hasTransferEncoding = ctx.headers.has('transfer-encoding')
      const hasContentLength = ctx.headers.has('content-length')
      if (hasTransferEncoding && hasContentLength) {
        return await next()
      }
      if (hasContentLength && !hasTransferEncoding) {
        const contentLength = parseInt(ctx.headers.get('content-length') || '0', 10)
        if (contentLength > maxSize) {
          return ctx.handleError(413, new Error('Request entity too large'))
        }
        return await next()
      }
      return await next()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return ctx.handleError(500, new Error(`Body limit error: ${errorMessage}`))
    }
  }
}
