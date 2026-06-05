import type * as Types from '@interfaces/index.ts'
import * as Middleware from '@middleware/index.ts'

/**
 * Request body size limit middleware.
 * @description Rejects or streams with limit, returns 413 when exceeded.
 */
export class BodyLimit {
  /**
   * Create body limit middleware.
   * @description Rejects or limits body stream, returns 413.
   * @param options - Max size in bytes
   * @returns Middleware that enforces limit
   */
  static create(options: Types.BodyLimitOptions): Types.Middleware {
    const maxSize = options.limit
    return Middleware.Utils.wrapMiddleware('Body limit error', async (ctx, next) => {
      if (ctx.request.method === 'GET' || ctx.request.method === 'HEAD') {
        return await next()
      }
      if (ctx.headers.has('content-length') && !ctx.headers.has('transfer-encoding')) {
        const contentLength = Number(ctx.headers.get('content-length'))
        if (Number.isNaN(contentLength) || contentLength < 0 || contentLength > maxSize) {
          return await ctx.handleError(
            413,
            new Deno.errors.InvalidData(`Request body exceeds ${maxSize} bytes limit`)
          )
        }
      }
      const requestBody = ctx.request.body
      if (requestBody) {
        const limited = BodyLimit.createLimitStream(requestBody, maxSize)
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
   * Wrap stream with byte limit.
   * @description Reads stream and enqueues until limit, then errors.
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
    let bytesRead = 0
    return new ReadableStream({
      async start(controller) {
        const reader = stream.getReader()
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              break
            }
            bytesRead += value.length
            if (bytesRead > maxBytes) {
              reader.cancel()
              const sizeError = new Deno.errors.InvalidData(
                `Request body exceeds ${maxBytes} bytes limit`
              ) as Types.StatusError
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
