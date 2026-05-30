import type * as Core from '@core/index.ts'
import type { StaticFileHandler } from '@interfaces/Static.ts'
import type { MaybeAsync } from '@interfaces/Utility.ts'

/** Middleware bound to optional path. */
export interface MiddlewareEntry {
  /** Middleware function */
  readonly handler: Middleware
  /** Path prefix or exact match */
  readonly path: string
}

/** Route match result with handler. */
export interface RouteMetadata {
  /** Route or static file handler */
  readonly handler: RouteHandler | StaticFileHandler
  /** Path pattern used for matching */
  readonly pattern: string
}

/** Async-only middleware result derived from MiddlewareResult. */
export type AsyncMiddlewareResult = Promise<Awaited<MiddlewareResult>>

/**
 * Middleware function with context.
 * @description Processes request and optionally delegates to next.
 * @param ctx - Request context
 * @param next - Calls next middleware in chain
 * @returns Response or undefined, sync or async
 */
export type Middleware = (ctx: Core.Context, next: NextFn) => MiddlewareResult

/** Middleware result type alias. */
export type MiddlewareResult = MaybeAsync<Response | undefined>

/** Next function passed to middleware. */
export type NextFn = () => AsyncMiddlewareResult

/**
 * Route handler receiving context.
 * @description Processes matched route and returns response.
 * @param context - Request context
 * @returns Response sync or async
 */
export type RouteHandler = (context: Core.Context) => MaybeAsync<Response>
