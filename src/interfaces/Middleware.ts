import type * as Types from '@interfaces/index.ts'
import type * as Core from '@core/index.ts'

/** Middleware result: Response or undefined. */
type MiddlewareResult = Response | undefined

/** Middleware function with context and next. */
export type Middleware = (
  ctx: Core.Context,
  next: () => Promise<Response | undefined>
) => MiddlewareResult | Promise<MiddlewareResult>

/** Middleware bound to optional path. */
export interface MiddlewareEntry {
  /** Middleware function */
  handler: Middleware
  /** Path prefix or exact; '' or '*' for all */
  path: string
}

/** Route handler receiving context and returning Response. */
export type RouteHandler = (context: Core.Context) => Response | Promise<Response>

/** Route match result: handler and pattern. */
export interface RouteMetadata {
  /** Route or static file handler */
  handler: RouteHandler | Types.StaticFileHandler
  /** Path pattern used for matching */
  pattern: string
}
