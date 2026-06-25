import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'
import * as Middleware from '@middleware/index.ts'

/**
 * Request body size limit middleware.
 * @description Rejects requests exceeding configured byte limit.
 */
export class BodyLimit {
  /**
   * Create body limit middleware.
   * @description Builds middleware checking content-length header.
   * @param options - Body limit configuration in bytes
   * @returns Middleware function enforcing size limit
   */
  static create(options: Types.BodyLimitOptions): Types.MiddlewareFn {
    const maxBytes = Core.Handler.assertPositiveFinite(options.limit, 'Body limit', 'bytes')
    return Middleware.Wrap.apply('bodyLimit', async (ctx, next) => {
      const method = ctx.get.method()
      if (method === 'GET' || method === 'HEAD') {
        return await next()
      }
      const contentLength = ctx.get.header('content-length')
      if (contentLength !== undefined) {
        const declaredBytes = Number(contentLength)
        if (!Number.isInteger(declaredBytes) || declaredBytes < 0 || declaredBytes > maxBytes) {
          Core.Context.internalOf(ctx).emitEvent(
            Core.Observability.internalEvent('body:rejected', {
              limit: maxBytes,
              declared: Number.isInteger(declaredBytes) && declaredBytes >= 0 ? declaredBytes : null
            })
          )
          return await ctx.handleError(
            413,
            new Deno.errors.InvalidData(`Request body exceeds ${maxBytes} bytes limit`)
          )
        }
      }
      return await next()
    })
  }
}
