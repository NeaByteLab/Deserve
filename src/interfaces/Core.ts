import type * as Types from '@interfaces/index.ts'
import type * as Core from '@core/index.ts'

/**
 * Internal framework-only Context surface.
 * @description Members reachable cross-module via the InternalContext symbol.
 */
export interface ContextInternal {
  /**
   * Apply headers and cookies to Response.
   * @description Merges accumulated headers and cookies, existing values win.
   * @param response - Native Response to finalize
   * @returns Same Response with headers applied
   */
  finalizeRaw(response: globalThis.Response): globalThis.Response
  /**
   * Read captured framework error.
   * @description Returns error set by handleError, null when none.
   * @returns Framework Error or null
   */
  getFrameworkError(): Error | null
  /**
   * Replace request and reset body state.
   * @description Swaps the request and clears parsed body state.
   * @param req - New request to use
   */
  replaceRequest(req: Request): void
  /**
   * Merge percent-decoded route params.
   * @description Spread-merges decoded params into existing route params.
   * @param params - Params from the router match
   */
  setParams(params: StringRecord): void
  /**
   * Write reserved framework state key.
   * @description Internal write path for framework-wired keys.
   * @template T - Value type encoded in the key
   * @param key - Branded reserved state key
   * @param value - Value matching the key type
   */
  setInternalState<T>(key: StateKey<T>, value: T): void
  /** Snapshot of accumulated Set-Cookie values */
  readonly responseCookies: readonly string[]
  /** Snapshot copy of accumulated response headers */
  readonly responseHeadersMap: StringRecord
}

/** Error details for error middleware. */
export interface ErrorInfo {
  /** Caught error instance */
  readonly error: Error
  /** HTTP method of failed request */
  readonly method: string
  /** URL pathname of failed request */
  readonly pathname: string
  /** HTTP status code for response */
  readonly statusCode: number
  /** Full request URL string */
  readonly url: string
}

/**
 * Builds error response from status.
 * @description Constructs HTTP error response using context and middleware.
 */
export interface ErrorResponseBuilder {
  /**
   * Build error response.
   * @param ctx - Request context instance
   * @param statusCode - HTTP status code to send
   * @param error - Caught error instance
   * @param errorMiddleware - Optional error middleware handler
   * @returns Promise resolving to error response
   */
  build(
    ctx: Core.Context,
    statusCode: number,
    error: Error,
    errorMiddleware: ErrorMiddleware | null
  ): Promise<Response>
}

/** Parsed IP address value with version. */
export interface ParsedIp {
  /** Numeric address value */
  readonly value: bigint
  /** Address version, 4 or 6 */
  readonly version: 4 | 6
}

/**
 * Response helpers on context.
 * @description Provides typed methods for common response formats.
 */
export interface SendHelpers {
  /** Build custom response with body */
  readonly custom: ResponseFn<[body: BodyInit | null]>
  /** Build binary data download response */
  readonly data: ResponseFn<[data: Uint8Array | string, filename: string], [contentType?: string]>
  /** Serve file from filesystem path */
  readonly file: ResponseFn<[filePath: string, filename?: string], [], Promise<Response>>
  /** Build HTML content response */
  readonly html: ResponseFn<[html: string]>
  /** Build JSON serialized response */
  readonly json: ResponseFn<[data: unknown]>
  /** Build redirect response to URL */
  readonly redirect: (url: string, status?: RedirectStatus, options?: RedirectInit) => Response
  /** Build streaming response with ReadableStream */
  readonly stream: ResponseFn<[stream: ReadableStream], [contentType?: string]>
  /** Build plain text response */
  readonly text: ResponseFn<[text: string]>
}

/** Static file serving options. */
export interface ServeOptions {
  /** Cache-Control max-age in seconds */
  readonly cacheControl?: number
  /** Enable ETag header generation */
  readonly etag?: boolean
  /** Filesystem path to static directory */
  readonly path: string
}

/**
 * Serves static files from path.
 * @description Handles static file requests using serve options.
 */
export interface StaticHandler {
  /**
   * Serve static file response.
   * @param ctx - Request context instance
   * @param options - Static file serving options
   * @param urlPath - URL path to resolve
   * @returns Promise resolving to file response
   */
  serve(ctx: Core.Context, options: ServeOptions, urlPath: string): Promise<Response>
}

/** Worker message payload data. */
export interface WorkerMessageData {
  /** True when message indicates error */
  readonly error?: boolean
  /** Human-readable message text */
  readonly message?: string
}

/** Worker pool creation options. */
export interface WorkerPoolOptions {
  /** Optional lifecycle event emitter */
  readonly emit?: Types.EventEmit
  /** Maximum pending tasks before fast-rejecting */
  readonly maxQueueDepth?: number
  /** Maximum projected queue wait in ms */
  readonly maxQueueWaitMs?: number
  /** Number of workers in pool */
  readonly poolSize?: number
  /** URL to worker script module */
  readonly scriptURL: string
  /** Per-task timeout in milliseconds */
  readonly taskTimeoutMs?: number
}

/**
 * Handle to run worker tasks.
 * @description Dispatches payloads to pooled worker threads.
 */
export interface WorkerRunHandle {
  /**
   * Run task on worker.
   * @template T - Expected return type
   * @param payload - Data to send to worker
   * @returns Promise resolving to worker result
   */
  run<T = unknown>(payload: unknown): Promise<T>
}

/** Body format the request parsed. */
export type BodyParsedFormat = 'arraybuffer' | 'blob' | 'form' | 'json' | 'text'

/** 4xx client error status codes. */
export type ClientErrorCode =
  | 400
  | 401
  | 403
  | 404
  | 405
  | 408
  | 409
  | 410
  | 413
  | 414
  | 415
  | 422
  | 429

/**
 * Context-receiving function type.
 * @description Generic for handlers that take context and return R.
 * @template Args - Additional argument types after context
 * @template R - Return type wrapped in MaybeAsync
 */
export type ContextFn<Args extends readonly unknown[], R> = (
  ctx: Core.Context,
  ...args: Args
) => MaybeAsync<R>

/** Generic string-keyed data record. */
export type DataRecord = Record<string, unknown>

/**
 * Handler for route error responses.
 * @description Produces response from context, status, and error.
 */
export type ErrorHandler = ContextFn<[statusCode: number, error: Error], Response>

/**
 * Custom handler before error response.
 * @description Intercepts errors before default error response is built.
 */
export type ErrorMiddleware = ContextFn<[error: ErrorInfo], Response | null>

/** Extracted status code and error. */
export type ExtractedError = Pick<ErrorInfo, 'statusCode' | 'error'>

/** HTTP method literal union. */
export type HttpMethod = 'DELETE' | 'GET' | 'HEAD' | 'OPTIONS' | 'PATCH' | 'POST' | 'PUT'

/** HTTP status code branded type. */
export type HttpStatusCode = ClientErrorCode | ServerErrorCode

/** Matcher predicate for an IP string. */
export type IpMatcher = (ip: string) => boolean

/**
 * Sync or async value wrapper.
 * @template T - Wrapped value type
 */
export type MaybeAsync<T> = T | Promise<T>

/**
 * Callback that builds redirect response.
 * @description Constructs redirect Response with status and headers.
 * @param url - Target redirect URL
 * @param status - HTTP redirect status code
 * @param extraHeaders - Additional headers to include
 * @returns Redirect Response instance
 */
export type RedirectBuilder = (
  url: string,
  status: RedirectStatus,
  extraHeaders?: HeadersInit
) => Response

/** Optional headers for redirect init. */
export type RedirectInit = Pick<ResponseInit, 'headers'>

/** Valid HTTP redirect status codes. */
export type RedirectStatus = 301 | 302 | 303 | 307 | 308

/**
 * Response factory from payload args.
 * @description Appends optional ResponseInit and trailing args to payload.
 * @template Args - Leading payload argument tuple
 * @template Tail - Optional trailing argument tuple after options
 * @template R - Response return wrapper, sync or promised
 */
export type ResponseFn<
  Args extends readonly unknown[] = [],
  Tail extends readonly unknown[] = [],
  R extends Response | Promise<Response> = Response
> = (...args: [...Args, options?: ResponseInit, ...rest: Tail]) => R

/** 5xx server error status codes. */
export type ServerErrorCode = 500 | 501 | 502 | 503 | 504

/**
 * Branded key for state access.
 * @template T - Value type stored under key
 */
export type StateKey<T> = string & { readonly __stateValue: T }

/**
 * Carrier of an HTTP status code.
 * @description Single atom for status-bearing values; widen via S.
 * @template S - Confidence of the statusCode value
 */
export type StatusCarrier<S = number> = { readonly statusCode: S }

/** Error-like object with unknown statusCode property. */
export type StatusCodeCarrier = StatusCarrier<unknown>

/** Error with attached HTTP status code. */
export type StatusError = Error & { statusCode: number }

/** String key-value tuple pair. */
export type StringPair = [string, string]

/** String-to-string key-value record. */
export type StringRecord = Record<string, string>

/**
 * Widened tag carrier for fail-closed reads.
 * @description Readonly record exposing one string-typed discriminant key.
 * @template K - Discriminant property name
 */
export type TagCarrier<K extends string> = { readonly [P in K]: string }

/**
 * Discriminated-union member with tag.
 * @description Joins a readonly tag literal with payload shape.
 * @template Tag - Discriminant property name
 * @template K - Literal value of the discriminant
 * @template Shape - Payload properties for the member
 */
export type TaggedVariant<Tag extends string, K extends string, Shape = unknown> =
  & {
    readonly [P in Tag]: K
  }
  & Readonly<Shape>
