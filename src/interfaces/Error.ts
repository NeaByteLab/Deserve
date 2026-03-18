import type * as Core from '@core/index.ts'

/** Handler for route or middleware errors. */
export type ErrorHandler = (
  ctx: Core.Context,
  statusCode: number,
  error: Error
) => Response | Promise<Response>

/** Custom handler before default error response. */
export type ErrorMiddleware = (
  ctx: Core.Context,
  error: {
    /** Thrown error when available */
    error?: Error
    /** HTTP method of the request */
    method: string
    /** Request pathname */
    pathname: string
    /** HTTP status code for the error */
    statusCode: number
    /** Full request URL */
    url: string
  }
) => Response | Promise<Response | null> | null

/**
 * Builds Response for status and error.
 * @description Produces Response for given status and error.
 */
export interface ErrorResponseBuilder {
  /** Builds final error response. */
  build(
    ctx: Core.Context,
    statusCode: number,
    error: Error,
    errorMiddleware: ErrorMiddleware | null
  ): Promise<Response>
}
