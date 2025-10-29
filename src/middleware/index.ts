import type { Middleware } from '@app/Types.ts'
import { basicAuth, type BasicAuthOptions } from '@app/middleware/BasicAuth.ts'
import { bodyLimit, type BodyLimitOptions } from '@app/middleware/BodyLimit.ts'
import { cors, type CorsOptions } from '@app/middleware/CORS.ts'
import { websocket, type WebSocketOptions } from '@app/middleware/WebSocket.ts'

/**
 * Middleware utilities for common HTTP middleware.
 */
export const Mware = {
  /**
   * Basic authentication middleware configuration.
   * @param options - Basic auth configuration options
   * @returns Basic auth middleware function
   */
  basicAuth: (options: BasicAuthOptions): Middleware => basicAuth(options),
  /**
   * Body limit middleware configuration.
   * @param options - Body limit configuration options
   * @returns Body limit middleware function
   */
  bodyLimit: (options: BodyLimitOptions): Middleware => bodyLimit(options),
  /**
   * CORS middleware configuration.
   * @param options - CORS configuration options
   * @returns CORS middleware function
   */
  cors: (options?: CorsOptions): Middleware => cors(options),
  /**
   * WebSocket middleware configuration.
   * @param options - WebSocket configuration options
   * @returns WebSocket middleware function
   */
  websocket: (options?: WebSocketOptions): Middleware => websocket(options)
}
