import type * as Types from '@interfaces/index.ts'

/**
 * Middleware utility helpers.
 * @description Wraps middleware with error handling and label.
 */
export class Utils {
  /**
   * Wrap middleware with try/catch and label.
   * @description Catches errors and calls ctx.handleError with label.
   * @param label - Prefix for error message on throw
   * @param middleware - Middleware to run
   * @returns Middleware that delegates and catches
   */
  static wrapMiddleware(label: string, middleware: Types.Middleware): Types.Middleware {
    return async (ctx, next) => {
      try {
        return await middleware(ctx, next)
      } catch (error) {
        const statusError = error as Types.StatusError
        const statusCode = statusError.statusCode ?? 500
        const errorMessage = statusError.message || 'Unknown error'
        return await ctx.handleError(statusCode, new Deno.errors.Http(`${label} ${errorMessage}`))
      }
    }
  }
}
