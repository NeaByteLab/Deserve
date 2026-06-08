import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'
import * as Middleware from '@middleware/index.ts'

/**
 * Request body size limit middleware.
 * @description Rejects or streams with limit, returns 413 when exceeded.
 */
export class BodyLimit {
  /** Cached body-support verdict per method */
  private static readonly bodyMethodCache = new Map<string, boolean>()

  /**
   * Create body limit middleware.
   * @description Rejects or limits body stream, returns 413.
   * @param options - Max size in bytes
   * @returns Middleware that enforces limit
   */
  static create(options: Types.BodyLimitOptions): Types.MiddlewareFn {
    const maxSize = Core.Handler.assertPositiveFinite(options.limit, 'Body limit', 'bytes')
    return Middleware.WrapMware('Body limit error', async (ctx, next) => {
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
      if (requestBody && BodyLimit.methodAllowsBody(ctx.request.method)) {
        const limitedStream = BodyLimit.createLimitStream(requestBody, maxSize)
        const limitedRequest = new Core.API.Request(ctx.request.url, {
          method: ctx.request.method,
          headers: ctx.request.headers,
          body: limitedStream,
          duplex: 'half'
        } as RequestInit)
        ctx[Core.InternalContext].replaceRequest(limitedRequest)
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
              controller.error(
                Core.Handler.createStatusError(413, `Request body exceeds ${maxBytes} bytes limit`)
              )
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

  /**
   * Check if method supports body.
   * @description Probes Request constructor and memoizes per method.
   * @param method - Incoming request method
   * @returns True when method allows a body
   */
  private static methodAllowsBody(method: string): boolean {
    const cached = BodyLimit.bodyMethodCache.get(method)
    if (cached !== undefined) {
      return cached
    }
    let allowed: boolean
    try {
      void new Core.API.Request('http://body-limit.invalid/', {
        method,
        body: new ReadableStream(),
        duplex: 'half'
      } as RequestInit)
      allowed = true
    } catch {
      allowed = false
    }
    BodyLimit.bodyMethodCache.set(method, allowed)
    return allowed
  }
}
