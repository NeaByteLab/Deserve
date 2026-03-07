import type { Middleware, Types } from '@app/index.ts'
import * as Loader from '@app/middleware/Loaders.ts'
import MwareUtils from '@app/middleware/Utils.ts'

/** Middleware wrapper with try/catch and label. */
export const wrapMiddleware: (label: string, middleware: Middleware) => Middleware = MwareUtils
  .wrapMiddleware.bind(MwareUtils)

/** Prebuilt middleware factories for common use. */
export const Mware = {
  /** Basic Auth middleware factory */
  basicAuth: (options: Types.BasicAuthOptions): Middleware => Loader.BasicAuth.create(options),
  /** Body size limit middleware factory */
  bodyLimit: (options: Types.BodyLimitOptions): Middleware => Loader.BodyLimit.create(options),
  /** CORS middleware factory */
  cors: (options?: Types.CorsOptions): Middleware => Loader.Cors.create(options),
  /** Security headers middleware factory */
  securityHeaders: (options?: Types.SecurityHeadersOptions): Middleware =>
    Loader.SecHeaders.create(options),
  /** Session middleware factory (cookieSecret required) */
  session: (options: Types.SessionOptions): Middleware => Loader.Session.create(options),
  /** WebSocket upgrade middleware factory */
  websocket: (options?: Types.WebSocketOptions): Middleware => Loader.WebSocket.create(options)
}

/** Utility class for middleware error wrapping. */
export { default as MwareUtils } from '@app/middleware/Utils.ts'
