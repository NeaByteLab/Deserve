import type { Middleware } from '@app/Types.ts'
import { cors, type CorsOptions } from '@app/middleware/CORS.ts'

/**
 * Middleware utilities for common HTTP middleware.
 */
export const Mware = {
  /**
   * CORS middleware configuration.
   * @param options - CORS configuration options
   * @returns CORS middleware function
   */
  cors: (options?: CorsOptions): Middleware => cors(options)
}
