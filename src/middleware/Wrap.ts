import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'

/**
 * Middleware error wrapper utility.
 * @description Catches errors and prefixes label to message.
 */
export class Wrap {
  /**
   * Wrap middleware with error handling.
   * @description Catches thrown errors and routes to handler.
   * @param label - Middleware name for message prefix
   * @param middleware - Middleware function to wrap
   * @returns Wrapped middleware function
   */
  static apply(label: string, middleware: Types.MiddlewareFn): Types.MiddlewareFn {
    return async (ctx, next) => {
      try {
        return await middleware(ctx, next)
      } catch (caught) {
        const extracted = Core.Handler.extractError(caught)
        extracted.error.message = `[${label}] ${extracted.error.message}`
        return await ctx.handleError(extracted.statusCode, extracted.error)
      }
    }
  }
}
