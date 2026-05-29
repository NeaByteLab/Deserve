import type * as Types from '@interfaces/index.ts'
import type * as Core from '@core/index.ts'

/** Middleware bound to optional path. */
export interface MiddlewareEntry {
  /** Middleware function */
  handler: Middleware
  /** Path prefix or exact match */
  path: string
}

/** Route match result with handler. */
export interface RouteMetadata {
  /** Route or static file handler */
  handler: RouteHandler | Types.StaticFileHandler
  /** Path pattern used for matching */
  pattern: string
}

/**
 * Middleware function with context.
 * @description Processes request and optionally delegates to next.
 * @param ctx - Request context
 * @param next - Calls next middleware in chain
 * @returns Response or undefined, sync or async
 */
export type Middleware = (
  ctx: Core.Context,
  next: () => Promise<Response | undefined>
) => MiddlewareResult

/**
 * Route handler receiving context.
 * @description Processes matched route and returns response.
 * @param context - Request context
 * @returns Response sync or async
 */
export type RouteHandler = (context: Core.Context) => MaybeAsync<Response>

/** Sync or async value. */
type MaybeAsync<T> = T | Promise<T>

/** Middleware result type alias. */
type MiddlewareResult = MaybeAsync<Response | undefined>
