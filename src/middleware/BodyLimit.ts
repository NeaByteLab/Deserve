import type * as Types from '@interfaces/index.ts'
import * as Middleware from '@middleware/index.ts'

/**
 * Request body size limit middleware.
 * @description Rejects or streams with limit; returns 413 when exceeded.
 */
export class BodyLimit {
  /**
   * Create body limit middleware.
   * @description Rejects or limits body stream; returns 413 when over.
   * @param options - Max size in bytes
   * @returns Middleware that enforces limit
   */
  static create(options: Types.BodyLimitOptions): Types.Middleware {
    const maxSize = options.limit ?? 1024 * 1024
    return Middleware.Utils.wrapMiddleware('Body limit error', async (ctx, next) => {
      if (ctx.request.method === 'GET' || ctx.request.method === 'HEAD') {
        return await next()
      }
      const hasContentLength = ctx.headers.has('content-length')
      const hasTransferEncoding = ctx.headers.has('transfer-encoding')
      if (hasContentLength && !hasTransferEncoding) {
        const contentLength = parseInt(ctx.headers.get('content-length') || '0', 10)
        if (contentLength > maxSize) {
          return await ctx.handleError(413, new Error('Request entity too large'))
        }
      }
      const body = ctx.request.body
      if (body) {
        const limited = BodyLimit.createLimitStream(body, maxSize)
        const newReq = new Request(ctx.request.url, {
          method: ctx.request.method,
          headers: ctx.request.headers,
          body: limited,
          duplex: 'half'
        } as RequestInit)
        ctx.replaceRequest(newReq)
      }
      return await next()
    })
  }

  /**
   * Wrap stream with byte limit; error when over.
   * @description Reads stream and enqueues until limit; then errors.
   * @param stream - Request body stream
   * @param maxBytes - Max bytes before error
   * @returns Limited stream or null
   */
  private static createLimitStream(
    stream: ReadableStream<Uint8Array> | null,
    maxBytes: number
  ): ReadableStream<Uint8Array> | null {
    if (!stream) {
      return null
    }
    let total = 0
    return new ReadableStream({
      async start(controller) {
        const reader = stream.getReader()
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              break
            }
            total += value.length
            if (total > maxBytes) {
              reader.cancel()
              const sizeError = new Error('Request entity too large') as Error & {
                statusCode?: number
              }
              sizeError.statusCode = 413
              controller.error(sizeError)
              return
            }
            controller.enqueue(value)
          }
          controller.close()
        } catch (readError) {
          controller.error(readError)
        }
      }
    })
  }
}
