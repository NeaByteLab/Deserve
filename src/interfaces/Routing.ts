import type * as Types from '@interfaces/index.ts'
import type * as Core from '@core/index.ts'

/**
 * Scoped middleware registration entry.
 * @description Pairs path prefix with middleware handler.
 */
export interface MiddlewareEntry {
  /** Path prefix scoping the middleware */
  readonly path: string
  /** Middleware handler function */
  readonly handler: Types.MiddlewareFn
}

/**
 * Mutable per request state holder.
 * @description Carries context, error, URL, and pattern.
 */
export interface RequestHolder {
  /** Active request context or null */
  ctx: Core.Context | null
  /** Captured framework error or null */
  frameworkError: Error | null
  /** Parsed request URL or undefined */
  parsedUrl: URL | undefined
  /** Matched route pattern or undefined */
  routePattern: string | undefined
}

/**
 * Route file change descriptor.
 * @description Holds full path and route path.
 */
export interface RouteChange {
  /** Absolute path to route file */
  readonly fullPath: string
  /** Route path relative to directory */
  readonly routePath: string
}

/**
 * Registered route lookup entry.
 * @description Pairs route handler with its pattern.
 */
export interface RouteEntry {
  /** Route handler function */
  readonly handler: Types.RouteHandler
  /** Route pattern string */
  readonly pattern: string
}

/**
 * Static mount registration entry.
 * @description Pairs URL prefix with serving handler.
 */
export interface StaticMount {
  /** URL prefix for static files */
  readonly urlPrefix: string
  /** Serving handler for the mount */
  readonly handler: Types.StaticFn
}

/**
 * Deno server request handler.
 * @description Handles request and returns response promise.
 * @param req - Incoming request instance
 * @param info - Optional Deno serve handler info
 * @returns Promise resolving to response
 */
export type ServeHandler = (req: Request, info?: Deno.ServeHandlerInfo) => Promise<Response>
