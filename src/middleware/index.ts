import type * as Types from '@interfaces/index.ts'
import * as Loader from '@middleware/Loaders.ts'

/**
 * Wrap middleware with try/catch and label.
 * @description Catches errors and calls ctx.handleError with label.
 * @param label - Prefix for error message on throw
 * @param middleware - Middleware to run
 * @returns Middleware that delegates and catches
 */
export const wrapMiddleware: (label: string, middleware: Types.Middleware) => Types.Middleware =
  Loader.Utils.wrapMiddleware.bind(Loader.Utils)

/**
 * Prebuilt middleware factories.
 * @description Common middleware creators for auth, CORS, session.
 */
export const Mware = {
  /** Basic Auth middleware factory */
  basicAuth: (options: Types.BasicAuthOptions): Types.Middleware =>
    Loader.BasicAuth.create(options),
  /** Body size limit middleware factory */
  bodyLimit: (options: Types.BodyLimitOptions): Types.Middleware =>
    Loader.BodyLimit.create(options),
  /** CORS middleware factory */
  cors: (options?: Types.CorsOptions): Types.Middleware => Loader.Cors.create(options),
  /** Security headers middleware factory */
  securityHeaders: (options?: Types.SecurityHeadersOptions): Types.Middleware =>
    Loader.SecHeaders.create(options),
  /** Session middleware factory */
  session: (options: Types.SessionOptions): Types.Middleware => Loader.Session.create(options),
  /** WebSocket upgrade middleware factory */
  websocket: (options?: Types.WebSocketOptions): Types.Middleware =>
    Loader.WebSocket.create(options)
}

/** Re-exports middleware public API. */
export * from '@middleware/Loaders.ts'
export * from '@middleware/Utils.ts'
