import type { Context } from '@app/Context.ts'

/**
 * Error handling middleware function.
 * @param req - Request object
 * @param error - Error information
 * @returns Error response or null to use default
 */
export type ErrorMiddleware = (
  req: Request,
  error: {
    error?: Error
    method: string
    path: string
    statusCode: number
  }
) => Response | null

/**
 * Middleware function.
 * @param ctx - Request context
 * @param next - Function to call next middleware
 * @returns Response or undefined (can be synchronous or wrapped in Promise)
 */
export type Middleware = (
  ctx: Context,
  next: () => Promise<Response>
) => MiddlewareResult | Promise<MiddlewareResult>

/**
 * Middleware entry binding handler to path pattern.
 */
export interface MiddlewareEntry {
  /** Middleware function */
  handler: Middleware
  /** Path pattern for middleware (empty for global) */
  path: string
}

/**
 * Route handler function.
 * @param context - Request context
 * @returns Response or promise of response
 */
export type RouteHandler = (context: Context) => Response | Promise<Response>

/**
 * Route metadata.
 */
export interface RouteMetadata {
  /** Handler function for the route */
  handler: RouteHandler | StaticFileHandler
  /** Route pattern string */
  pattern: string
}

/**
 * Router configuration options.
 */
export interface RouterOptions {
  /** Directory containing route files */
  routesDir: string
}

/**
 * Static file serving options.
 */
export interface ServeOptions {
  /** Directory path to serve files from */
  path: string
  /** Enable ETag generation (optional) */
  etag?: boolean
  /** Cache control max-age in seconds (optional) */
  cacheControl?: number
}

/**
 * Static file handler type.
 */
export type StaticFileHandler = {
  /** Indicates this is a static route */
  staticRoute: true
  /** Executes static file serving */
  execute: (ctx: Context) => Promise<Response>
}

/**
 * Middleware return type - can be returned directly or wrapped in Promise
 */
type MiddlewareResult = Response | undefined
