import type * as Core from '@core/index.ts'
import type * as Types from '@interfaces/index.ts'
import type { ContractFn } from '@neabyte/typebox'
import type DVE from '@neabyte/dve'

/**
 * Internal context control surface.
 * @description Framework only hooks for context state.
 */
export interface ContextInternal {
  /**
   * Emit observability event.
   * @description Forwards event to context emitter.
   * @param event - Event payload to emit
   */
  emitEvent(event: EventBase): void
  /**
   * Finalize raw response headers.
   * @description Merges pending headers and cookies.
   * @param response - Raw response to finalize
   * @returns Same response with merged headers
   */
  finalizeRaw(response: globalThis.Response): globalThis.Response
  /**
   * Read captured framework error.
   * @description Returns last error or null.
   * @returns Framework error or null
   */
  getFrameworkError(): Error | null
  /**
   * Install session controller.
   * @description Enables session reads and writes.
   * @param controller - Session controller to install
   */
  installSession(controller: Types.SessionController): void
  /**
   * Install validated data controller.
   * @description Enables validated data reads.
   * @param controller - Validated controller to install
   */
  installValidated(controller: ValidatedController): void
  /**
   * Install worker pool controller.
   * @description Enables worker task dispatch.
   * @param controller - Worker controller to install
   */
  installWorker(controller: WorkerController): void
  /**
   * Set decoded route parameters.
   * @description Stores parameters for context reads.
   * @param params - Route parameter record
   */
  setParams(params: StringRecord): void
}

/**
 * Cookie attribute initialization options.
 * @description Configures cookie scope and flags.
 */
export interface CookieInit {
  /** Cookie domain scope */
  domain?: string
  /** Cookie expiry date or timestamp */
  expires?: Date | number
  /** Mark cookie as HTTP only */
  httpOnly?: boolean
  /** Cookie max age in seconds */
  maxAge?: number
  /** Cookie path scope */
  path?: string
  /** Cookie SameSite policy */
  sameSite?: SameSitePolicy
  /** Mark cookie as secure */
  secure?: boolean
}

/**
 * Error information for handlers.
 * @description Carries error, request, and status data.
 */
export interface ErrorInfo {
  /** Caught error instance */
  readonly error: Error
  /** Request HTTP method */
  readonly method: string
  /** Request path name */
  readonly pathname: string
  /** HTTP status code */
  readonly statusCode: number
  /** Full request URL */
  readonly url: string
}

/**
 * Request reading helper methods.
 * @description Reads method, URL, headers, and body.
 */
export interface GetHelpers {
  /**
   * Read client IP address.
   * @description Returns direct peer when option set.
   * @param options - Optional direct IP flag
   * @returns Client IP or undefined
   */
  ip(options?: IpDirectOption): string | undefined
  /**
   * Read request HTTP method.
   * @returns Request method string
   */
  method(): string
  /**
   * Read parsed request URL.
   * @returns Request URL instance
   */
  url(): URL
  /**
   * Read request path name.
   * @returns Request path string
   */
  pathname(): string
  /**
   * Read underlying request instance.
   * @returns Request instance
   */
  request(): Request
  /** Read request header value or map */
  header: RecordAccessor
  /** Read request cookie value or map */
  cookie: RecordAccessor
  /** Read query parameter value or map */
  query: RecordAccessor
  /** Read route parameter value or map */
  param: RecordAccessor
  /**
   * Read request body by type.
   * @description Chooses reader from content type.
   * @returns Promise resolving to body value
   * @template T - Body value type
   */
  body<T = unknown>(): Promise<T>
  /**
   * Read request body as JSON.
   * @returns Promise resolving to parsed JSON
   * @template T - JSON value type
   */
  json<T = unknown>(): Promise<T>
  /**
   * Read request body as text.
   * @returns Promise resolving to body text
   */
  text(): Promise<string>
  /**
   * Read request body as form data.
   * @returns Promise resolving to form data
   */
  formData(): Promise<FormData>
  /**
   * Read request body as blob.
   * @returns Promise resolving to body blob
   */
  blob(): Promise<Blob>
  /**
   * Read request body as bytes.
   * @returns Promise resolving to byte array
   */
  bytes(): Promise<Uint8Array>
  /**
   * Read current session data.
   * @returns Session data or null
   */
  session(): Types.SessionData | null
  /**
   * Read validated request data.
   * @description Requires validate middleware registration.
   * @returns Validated data map
   * @template SchemaType - Validation schema type
   */
  validated<SchemaType extends ValidationSchema>(): ValidatedMap<SchemaType>
  /**
   * Read worker pool controller.
   * @returns Worker controller instance
   */
  worker(): WorkerController
}

/**
 * Direct IP read option.
 * @description Selects direct peer over resolved IP.
 */
export interface IpDirectOption {
  /** Read direct peer IP when true */
  direct?: boolean
}

/**
 * Parsed IP value and version.
 * @description Holds numeric value and protocol version.
 */
export interface ParsedIp {
  /** Numeric IP address value */
  readonly value: bigint
  /** IP protocol version */
  readonly version: 4 | 6
}

/**
 * RFC problem details payload.
 * @description Describes error type, title, and status.
 */
export interface ProblemDetails {
  /** Problem type URI */
  readonly type: string
  /** Short problem title */
  readonly title: string
  /** HTTP status code */
  readonly status: number
  /** Request instance path */
  readonly instance?: string
  /** Detailed error messages */
  readonly errors?: readonly string[]
}

/**
 * Template render initialization options.
 * @description Sets response status and stream flag.
 */
export interface RenderInit {
  /** Response HTTP status code */
  status?: HttpStatusCode
  /** Stream rendered output when true */
  stream?: boolean
}

/**
 * Router constructor options.
 * @description Configures routes, views, and limits.
 */
export interface RouterOptions {
  /** Route loading options */
  routes?: RoutesOptions
  /** View rendering options */
  views?: ViewsOptions
  /** Enable hot reload watching */
  hotReload?: boolean
  /** Maximum request URL length */
  maxUrlLength?: number
  /** Request timeout in milliseconds */
  timeoutMs?: number
  /** Trusted proxy configuration */
  trustProxy?: TrustProxyConfig
  /** Worker pool configuration */
  worker?: WorkerPoolOptions
}

/**
 * Route loading options.
 * @description Sets routes directory and parameter limit.
 */
export interface RoutesOptions {
  /** Routes directory path */
  directory?: string
  /** Maximum route parameter length */
  maxParamLength?: number
}

/**
 * Response sending helper methods.
 * @description Builds JSON, text, HTML, and redirects.
 */
export interface SendHelpers {
  /**
   * Send JSON response body.
   * @description Serializes data as JSON.
   * @param data - Data to serialize
   * @param options - Optional response init
   * @returns JSON response instance
   * @template T - Data value type
   */
  json<T = unknown>(data: T, options?: SendInit): Response
  /**
   * Send plain text response.
   * @param text - Text body to send
   * @param options - Optional response init
   * @returns Text response instance
   */
  text(text: string, options?: SendInit): Response
  /**
   * Send HTML response body.
   * @param html - HTML body to send
   * @param options - Optional response init
   * @returns HTML response instance
   */
  html(html: string, options?: SendInit): Response
  /**
   * Send custom response body.
   * @param body - Response body or null
   * @param options - Optional response init
   * @returns Custom response instance
   */
  custom(body: BodyInit | null, options?: SendInit): Response
  /**
   * Send file download response.
   * @description Adds content disposition header.
   * @param body - Download body content
   * @param filename - Suggested download filename
   * @param options - Optional response init
   * @returns Download response instance
   */
  download(body: DownloadBody, filename: string, options?: SendInit): Response
  /**
   * Send empty response body.
   * @param status - Optional HTTP status code
   * @returns Empty response instance
   */
  empty(status?: HttpStatusCode): Response
  /**
   * Send redirect response.
   * @description Validates and resolves location.
   * @param url - Redirect target location
   * @param status - Optional redirect status
   * @param options - Optional redirect init
   * @returns Redirect response instance
   */
  redirect(url: string, status?: RedirectStatus, options?: RedirectInit): Response
}

/**
 * Static file serving options.
 * @description Sets path, ETag, and cache control.
 */
export interface ServeOptions {
  /** Filesystem path to static directory */
  path: string
  /** Enable ETag header generation */
  etag?: boolean
  /** Cache-Control max age seconds */
  cacheControl?: number
}

/**
 * Response setting helper methods.
 * @description Sets headers, cookies, and session.
 */
export interface SetHelpers {
  /**
   * Set single response header.
   * @param key - Header name to set
   * @param value - Header value to set
   * @returns Same helpers for chaining
   */
  header(key: string, value: string): SetHelpers
  /**
   * Set multiple response headers.
   * @param headers - Header name value record
   * @returns Same helpers for chaining
   */
  headers(headers: StringRecord): SetHelpers
  /**
   * Set response cookie value.
   * @param name - Cookie name to set
   * @param value - Cookie value to set
   * @param options - Optional cookie attributes
   * @returns Same helpers for chaining
   */
  cookie(name: string, value: string, options?: CookieInit): SetHelpers
  /**
   * Write session data to cookie.
   * @param data - Session data or null
   * @returns Promise resolving when write completes
   */
  session(data: Types.SessionData | null): Promise<void>
}

/**
 * Validated data controller.
 * @description Exposes frozen validated value.
 */
export interface ValidatedController {
  /** Frozen validated value */
  readonly value: ValidatedValue
}

/**
 * View rendering options.
 * @description Sets views directory and render limits.
 */
export interface ViewsOptions {
  /** Views directory path */
  directory?: string
  /** Maximum loop iterations per block */
  maxIterations?: number
  /** Maximum body executions per render */
  maxRenderIterations?: number
  /** Maximum output characters per render */
  maxOutputSize?: number
  /** Maximum template size in characters */
  maxTemplateSize?: number
}

/**
 * Worker pool task controller.
 * @description Dispatches payloads to worker pool.
 */
export interface WorkerController {
  /**
   * Run task on worker pool.
   * @param payload - Task payload to dispatch
   * @returns Promise resolving to task result
   * @template T - Task result type
   */
  run<T = unknown>(payload: unknown): Promise<T>
}

/**
 * Worker response message data.
 * @description Carries error flag and message.
 */
export interface WorkerMessageData {
  /** Error flag set on failure */
  readonly error?: boolean
  /** Error message when failed */
  readonly message?: string
}

/**
 * Worker pool configuration options.
 * @description Sets script, size, and queue limits.
 */
export interface WorkerPoolOptions {
  /** Maximum pending task count */
  readonly maxQueueDepth?: number
  /** Maximum projected wait milliseconds */
  readonly maxQueueWaitMs?: number
  /** Worker pool size */
  readonly poolSize?: number
  /** Worker script URL */
  readonly scriptURL: string
  /** Per task timeout milliseconds */
  readonly taskTimeoutMs?: number
}

/** Supported request body read format */
export type BodyFormat = 'blob' | 'bytes' | 'form' | 'json' | 'text'

/** Inclusive byte range start and end */
export type ByteRange = { readonly start: number; readonly end: number }

/** Compiled template result from DVE */
export type CompileResult = ReturnType<DVE['compile']>

/**
 * Context bound handler function.
 * @description Receives context plus extra arguments.
 * @template Args - Extra argument tuple type
 * @template R - Handler return value type
 */
export type ContextFn<Args extends readonly unknown[], R> = (
  ctx: Core.Context,
  ...args: Args
) => MaybeAsync<R>

/** Download response body source type */
export type DownloadBody = ReadableStream<Uint8Array> | BufferSource | string

/** Error handling middleware function */
export type ErrorMiddleware = ContextFn<[info: ErrorInfo], Response | null>

/** Union of all lifecycle events */
export type EventBase = {
  [Kind in keyof EventSchemaMap]: LifecycleEvent<Kind, EventSchemaMap[Kind]>
}[keyof EventSchemaMap]

/**
 * Lifecycle event by kind.
 * @description Extracts event matching given kind.
 * @template Kind - Event kind discriminator
 */
export type EventByKind<Kind extends EventKind> = Extract<EventBase, { kind: Kind }>

/** Event channel internal or external */
export type EventChannel = 'internal' | 'external'

/** Event metadata carrying an error */
export type EventErrorMeta = { error: Error }

/**
 * Event listener callback function.
 * @description Receives a lifecycle event.
 * @param event - Lifecycle event payload
 */
export type EventFn = (event: EventBase) => void

/** Union of all event kinds */
export type EventKind = keyof EventSchemaMap

/** Request event metadata with metrics */
export type EventRequestMeta = RequestMetrics & {
  method: string
  statusCode: number
  url: string
  durationMs: number
  error?: Error
}

/** Route event metadata path and pattern */
export type EventRouteMeta = { routePath: string; pattern: string }

/** Event kind to metadata schema map */
export type EventSchemaMap = {
  'server:started': { port: number; hostname: string }
  'server:stopped': Record<never, never>
  'route:added': EventRouteMeta
  'route:updated': EventRouteMeta
  'route:removed': EventRouteMeta
  'route:ignored': { routePath: string; reason: string }
  'route:failed': { routePath: string } & EventErrorMeta
  'view:compiled': EventViewMeta
  'view:rendered': EventViewMeta
  'view:invalidated': { paths: readonly string[] }
  'view:failed': { path: string } & EventErrorMeta
  'session:invalid': { cookieName: string; reason: SessionInvalidReason }
  'csrf:failed': { rule: CsrfRuleName } & EventErrorMeta
  'cors:blocked': { origin: string }
  'auth:failed': { reason: AuthFailReason }
  'ip:denied': { ip: string }
  'validate:failed': { source: ValidationSource; reasons: readonly string[] }
  'body:rejected': { limit: number; declared: number | null }
  'websocket:rejected': { reason: WebSocketRejectReason }
  'static:missing': { path: string }
  'process:failed': { origin: ProcessErrorOrigin } & EventErrorMeta
  'worker:crashed': EventWorkerMeta & EventErrorMeta
  'worker:rejected': { reason: WorkerRejectReason; queueDepth: number; maxQueueDepth: number }
  'worker:respawned': EventWorkerMeta
  'worker:timeout': { timeoutMs: number } & EventWorkerMeta & EventErrorMeta
  'request:completed': EventRequestMeta
  'request:failed': EventRequestMeta
}

/** View event metadata path and duration */
export type EventViewMeta = { path: string; durationMs: number }

/** Worker event metadata worker index */
export type EventWorkerMeta = { workerIndex: number }

/** Extracted status code and error pair */
export type ExtractedError = Pick<ErrorInfo, 'statusCode' | 'error'>

/** Supported HTTP request method names */
export type HttpMethod = 'DELETE' | 'GET' | 'HEAD' | 'OPTIONS' | 'PATCH' | 'POST' | 'PUT'

/** Supported HTTP response status codes */
export type HttpStatusCode =
  | 200
  | 201
  | 202
  | 204
  | 206
  | 301
  | 302
  | 303
  | 304
  | 307
  | 308
  | 400
  | 401
  | 403
  | 404
  | 405
  | 406
  | 408
  | 409
  | 410
  | 413
  | 414
  | 415
  | 422
  | 426
  | 429
  | 500
  | 501
  | 502
  | 503
  | 504

/**
 * IP matcher predicate function.
 * @description Tests whether IP matches a rule.
 * @param ip - IP address to test
 * @returns True when IP matches
 */
export type IpMatcher = (ip: string) => boolean

/**
 * Lifecycle event payload shape.
 * @description Holds channel, kind, metadata, and timestamp.
 * @template Kind - Event kind discriminator
 * @template Metadata - Event metadata shape
 */
export type LifecycleEvent<Kind extends string, Metadata> = {
  /** Event channel internal or external */
  readonly type: EventChannel
  /** Event kind discriminator */
  readonly kind: Kind
  /** Frozen event metadata */
  readonly metadata: Readonly<Metadata>
  /** Event creation timestamp */
  readonly timestamp: number
}

/**
 * Value or promise of value.
 * @description Wraps synchronous or async result.
 * @template T - Wrapped value type
 */
export type MaybeAsync<T> = T | Promise<T>

/**
 * Request middleware function.
 * @description Receives context and next continuation.
 * @param ctx - Request context instance
 * @param next - Next middleware continuation
 * @returns Response or undefined promise
 */
export type MiddlewareFn = (ctx: Core.Context, next: NextFn) => ReturnType<NextFn>

/**
 * Middleware next continuation function.
 * @description Invokes the next middleware in chain.
 * @returns Response or undefined promise
 */
export type NextFn = () => Promise<Response | undefined>

/** Process error origin discriminator */
export type ProcessErrorOrigin =
  | 'process:exit'
  | 'process:signal'
  | 'uncaughterror'
  | 'unhandledrejection'

/** Global object exposing optional process */
export type ProcessGlobal = { process?: Record<string, unknown> }

/**
 * Record value and key accessor.
 * @description Returns full record or single value.
 */
export type RecordAccessor = {
  (): StringRecord
  (key: string): string | undefined
}

/** Redirect response init headers only */
export type RedirectInit = Pick<ResponseInit, 'headers'>

/** Allowed HTTP redirect status codes */
export type RedirectStatus = 301 | 302 | 303 | 307 | 308

/**
 * View render function signature.
 * @description Renders template with data and options.
 * @param template - Template name to render
 * @param data - View data for template
 * @param options - Render options like status
 * @returns Promise resolving to rendered response
 */
export type RenderFn = (template: string, data: ViewData, options: RenderInit) => Promise<Response>

/** Resolved rendering options from router */
export type RenderingOptions = NonNullable<Required<RouterOptions>['views']>

/** Optional request metrics for events */
export type RequestMetrics = {
  ip?: string
  route?: string
  serverAddress?: string
  serverPort?: number
  userAgent?: string
  requestSize?: number
  responseSize?: number
}

/** Resolved file info and path */
export type ResolvedFile = { readonly fileInfo: Deno.FileInfo; readonly filePath: string }

/** Route handler returning a response */
export type RouteHandler = ContextFn<[], Response>

/** Imported route module export record */
export type RouteModule = Record<string, unknown>

/**
 * Dynamic module import function.
 * @description Imports module by specifier string.
 * @param specifier - Module specifier to import
 * @returns Promise resolving to route module
 */
export type RuntimeImport = (specifier: string) => Promise<RouteModule>

/** Cookie SameSite policy value */
export type SameSitePolicy = 'Lax' | 'None' | 'Strict'

/** Response send init without status override */
export type SendInit = Omit<ResponseInit, 'status'> & { status?: HttpStatusCode }

/** Reason a session was rejected */
export type SessionInvalidReason = 'expired' | 'malformed' | 'tampered'

/** CSRF rule that threw during evaluation */
export type CsrfRuleName = 'origin' | 'secFetchSite'

/** Reason basic auth rejected credentials */
export type AuthFailReason = 'missing' | 'malformed' | 'invalid'

/** Reason a websocket handshake was rejected */
export type WebSocketRejectReason = 'origin' | 'version' | 'malformed'

/**
 * Validation source reader function.
 * @description Reads a value from request helpers.
 * @param get - Request reading helpers
 * @returns Source value or promise
 */
export type SourceReader = (get: GetHelpers) => Promise<unknown> | unknown

/** Source reader map by validation source */
export type SourceReaders = Readonly<Record<ValidationSource, SourceReader>>

/**
 * Static file serving function.
 * @description Serves response for a URL path.
 * @param ctx - Request context instance
 * @param urlPath - URL path relative to mount
 * @returns Response or promise of response
 */
export type StaticFn = (ctx: Core.Context, urlPath: string) => MaybeAsync<Response>

/**
 * Object carrying an HTTP status.
 * @description Holds a readonly status code value.
 * @template S - Status code value type
 */
export type StatusCarrier<S = number> = { readonly statusCode: S }

/** Error carrying an HTTP status code */
export type StatusError = Error & StatusCarrier<number>

/** Tuple of two string values */
export type StringPair = [string, string]

/** Record of string keys to strings */
export type StringRecord = Record<string, string>

/** Trusted proxy rules or matcher */
export type TrustProxyConfig = readonly string[] | IpMatcher

/**
 * Validated output map by schema.
 * @description Maps schema keys to validated outputs.
 * @template SchemaType - Validation schema type
 */
export type ValidatedMap<SchemaType extends ValidationSchema> = {
  readonly [Key in keyof SchemaType]: SchemaType[Key] extends ContractFn
    ? ValidatedOutput<SchemaType[Key]>
    : never
}

/**
 * Validated output of a contract.
 * @description Awaited return type of contract function.
 * @template ContractType - Contract function type
 */
export type ValidatedOutput<ContractType extends ContractFn> = Awaited<ReturnType<ContractType>>

/** Frozen validated value record */
export type ValidatedValue = Readonly<Record<string, unknown>>

/** Validation schema by request source */
export type ValidationSchema = Partial<Record<ValidationSource, ContractFn>>

/** Request source for validation */
export type ValidationSource = 'body' | 'cookies' | 'headers' | 'query'

/** View template data record */
export type ViewData = Record<string, unknown>

/** Reason a worker task was rejected */
export type WorkerRejectReason = 'queue-depth' | 'queue-wait'
