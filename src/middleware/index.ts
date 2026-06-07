import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'
import * as Loader from '@middleware/Loaders.ts'

/**
 * Prebuilt middleware factories.
 * @description Common middleware creators for auth, CORS, session.
 */
export const Mware = {
  /** Basic Auth middleware factory */
  basicAuth: (options: Types.BasicAuthOptions): Types.MiddlewareFn =>
    Loader.BasicAuth.create(options),
  /** Body size limit middleware factory */
  bodyLimit: (options: Types.BodyLimitOptions): Types.MiddlewareFn =>
    Loader.BodyLimit.create(options),
  /** CORS middleware factory */
  cors: (options?: Types.CorsOptions): Types.MiddlewareFn => Loader.Cors.create(options),
  /** Security headers middleware factory */
  securityHeaders: (options?: Types.SecurityHeadersOptions): Types.MiddlewareFn =>
    Loader.SecHeaders.create(options),
  /** Session middleware factory */
  session: (options: Types.SessionOptions): Types.MiddlewareFn => Loader.Session.create(options),
  /** WebSocket upgrade middleware factory */
  websocket: (options?: Types.WebSocketOptions): Types.MiddlewareFn =>
    Loader.WebSocket.create(options)
}

/**
 * Wrap middleware with try/catch and label.
 * @description Catches errors and calls ctx.handleError, preserves original error.
 * @param label - Context label for error diagnostics
 * @param middleware - Middleware to run
 * @returns Middleware that delegates and catches
 */
export function WrapMware(label: string, middleware: Types.MiddlewareFn): Types.MiddlewareFn {
  return async (ctx, next) => {
    try {
      return await middleware(ctx, next)
    } catch (error) {
      const extracted = Core.Handler.extractError(error)
      extracted.error.message = `[${label}] ${extracted.error.message}`
      return await ctx.handleError(extracted.statusCode, extracted.error)
    }
  }
}

/** Re-exports middleware public API. */
export * from '@middleware/Loaders.ts'
