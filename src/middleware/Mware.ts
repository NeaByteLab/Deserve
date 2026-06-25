import type * as Types from '@interfaces/index.ts'
import * as Middleware from '@middleware/index.ts'

/**
 * Middleware factory collection.
 * @description Convenience factories for built-in middleware.
 */
export const Mware = {
  basicAuth: (options: Types.BasicAuthOptions): Types.MiddlewareFn =>
    Middleware.BasicAuth.create(options),
  bodyLimit: (options: Types.BodyLimitOptions): Types.MiddlewareFn =>
    Middleware.BodyLimit.create(options),
  cors: (options?: Types.CorsOptions): Types.MiddlewareFn => Middleware.CORS.create(options),
  csrf: (options?: Types.CsrfOptions): Types.MiddlewareFn => Middleware.CSRF.create(options),
  ip: (options?: Types.IpOptions): Types.MiddlewareFn => Middleware.IP.create(options),
  securityHeaders: (options?: Types.SecurityHeadersOptions): Types.MiddlewareFn =>
    Middleware.SecurityHeaders.create(options),
  session: (options: Types.SessionOptions): Types.MiddlewareFn =>
    Middleware.Session.create(options),
  websocket: (options?: Types.WebSocketOptions): Types.MiddlewareFn =>
    Middleware.WebSocket.create(options)
} as const
