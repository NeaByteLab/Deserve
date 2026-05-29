import type * as Core from '@core/index.ts'

/** Error details passed to error middleware. */
export interface ErrorInfo {
  /** Thrown error when available */
  error?: Error
  /** HTTP method of the request */
  method: string
  /** Request pathname */
  pathname: string
  /** HTTP status code for error */
  statusCode: number
  /** Full request URL */
  url: string
}

/**
 * Builds error response from status.
 * @description Produces Response for given status and error.
 */
export interface ErrorResponseBuilder {
  /**
   * Build final error response.
   * @description Delegates to error middleware when present.
   * @param ctx - Request context
   * @param statusCode - HTTP status code
   * @param error - Thrown error instance
   * @param errorMiddleware - Optional error middleware
   * @returns Promise resolving to error response
   */
  build(
    ctx: Core.Context,
    statusCode: number,
    error: Error,
    errorMiddleware: ErrorMiddleware | null
  ): Promise<Response>
}

/**
 * Handler for route error responses.
 * @description Produces response from context and error.
 * @param ctx - Request context
 * @param statusCode - HTTP status code
 * @param error - Thrown error instance
 * @returns Response or async response
 */
export type ErrorHandler = (
  ctx: Core.Context,
  statusCode: number,
  error: Error
) => MaybeAsync<Response>

/**
 * Custom handler before error response.
 * @description Intercepts error before default response builder.
 * @param ctx - Request context
 * @param error - Error details object
 * @returns Response, null, or async variant
 */
export type ErrorMiddleware = (
  ctx: Core.Context,
  error: ErrorInfo
) => MaybeAsync<Response | null> | null

/** Sync or async value. */
type MaybeAsync<T> = T | Promise<T>
