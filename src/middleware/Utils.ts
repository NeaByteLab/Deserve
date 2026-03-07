import type { Middleware } from '@app/index.ts'

/**
 * Middleware utility helpers.
 * @description Wraps middleware with error handling and label.
 */
export default class MwareUtils {
  /**
   * Wrap middleware with try/catch and label.
   * @description Catches errors and calls ctx.handleError with label.
   * @param label - Prefix for error message on throw
   * @param middleware - Middleware to run
   * @returns Middleware that delegates and catches
   */
  static wrapMiddleware(label: string, middleware: Middleware): Middleware {
    return async (ctx, next) => {
      try {
        return await middleware(ctx, next)
      } catch (error) {
        const err = error as Error & { statusCode?: number }
        const status = err.statusCode ?? 500
        const message = err.message || 'Unknown error'
        return await ctx.handleError(status, new Error(`${label}: ${message}`))
      }
    }
  }
}
