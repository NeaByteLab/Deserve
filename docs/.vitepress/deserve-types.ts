/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="esnext" />

// ───────────────────────── Typebox: contract helpers ─────────────────────────

/** Single-input contract function signature */
export type ContractFn = (input: never) => unknown

/** First parameter type of a contract */
export type ContractInput<ContractType extends ContractFn> = Parameters<ContractType>[0]

/** Guard pass flag or reasons */
export type GuardVerdict = true | string | readonly string[]

/**
 * Synchronous guard for contract input.
 * @description Validates input and returns a verdict.
 * @template ContractType - Contract function type
 */
export type GuardFn<ContractType extends ContractFn> = (
  input: NoInfer<ContractInput<ContractType>>
) => GuardVerdict

/** One guard or guard list */
export type GuardInput<ContractType extends ContractFn> =
  | GuardFn<ContractType>
  | readonly GuardFn<ContractType>[]

// ───────────────────────── interfaces/Core.ts ─────────────────────────

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
  installSession(controller: SessionController): void
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
  session(): SessionData | null
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
  session(data: SessionData | null): Promise<void>
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
export type CompileResult = { readonly ast: readonly unknown[] }

/**
 * Context bound handler function.
 * @description Receives context plus extra arguments.
 * @template Args - Extra argument tuple type
 * @template R - Handler return value type
 */
export type ContextFn<Args extends readonly unknown[], R> = (
  ctx: Context,
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
export type EventRouteMeta = { path: string; pattern: string }

/** Event kind to metadata schema map */
export type EventSchemaMap = {
  'server:started': { port: number; hostname: string }
  'server:stopped': Record<never, never>
  'route:added': EventRouteMeta
  'route:updated': EventRouteMeta
  'route:removed': EventRouteMeta
  'route:ignored': { path: string; reason: string }
  'route:failed': { path: string } & EventErrorMeta
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
export type EventWorkerMeta = { index: number }

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
export type MiddlewareFn = (ctx: Context, next: NextFn) => ReturnType<NextFn>

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
export type StaticFn = (ctx: Context, urlPath: string) => MaybeAsync<Response>

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

// ───────────────────────── interfaces/Middleware.ts ─────────────────────────

/**
 * Basic auth middleware options.
 * @description Configures allowed users and realm.
 */
export interface BasicAuthOptions {
  /** Allowed basic auth users */
  readonly users: readonly BasicAuthUser[]
  /** Optional authentication realm name */
  readonly realm?: string
}

/**
 * Basic auth user credentials.
 * @description Holds username and password pair.
 */
export interface BasicAuthUser {
  /** Account username value */
  readonly username: string
  /** Account password value */
  readonly password: string
}

/**
 * Body limit middleware options.
 * @description Sets maximum allowed request body bytes.
 */
export interface BodyLimitOptions {
  /** Maximum request body size in bytes */
  readonly limit: number
}

/**
 * CORS middleware options.
 * @description Configures allowed origins, methods, and headers.
 */
export interface CorsOptions {
  /** Allowed request header names */
  readonly allowedHeaders?: readonly string[]
  /** Allow credentials on requests */
  readonly credentials?: boolean
  /** Exposed response header names */
  readonly exposedHeaders?: readonly string[]
  /** Preflight cache max age seconds */
  readonly maxAge?: number
  /** Allowed HTTP request methods */
  readonly methods?: readonly HttpMethod[]
  /** Allowed request origin values */
  readonly origin?: string | readonly string[]
}

/**
 * CSRF middleware options.
 * @description Configures origin and fetch site rules.
 */
export interface CsrfOptions {
  /** Allowed origin rule or predicate */
  readonly origin?: string | readonly string[] | CsrfRulePredicate
  /** Allowed fetch site rule or predicate */
  readonly secFetchSite?: string | readonly string[] | CsrfRulePredicate
}

/**
 * IP filter middleware options.
 * @description Configures whitelist and blacklist rules.
 */
export interface IpOptions {
  /** Allowed IP or CIDR rules */
  readonly whitelist?: readonly string[]
  /** Blocked IP or CIDR rules */
  readonly blacklist?: readonly string[]
}

/**
 * Session controller for context.
 * @description Exposes session state and write method.
 */
export interface SessionController {
  /** Current session state or null */
  readonly state: SessionData | null
  /**
   * Write session data to cookie.
   * @description Persists or clears session state.
   * @param data - Session data or null
   * @returns Promise resolving when write completes
   */
  write(data: SessionData | null): Promise<void>
}

/**
 * Default session cookie values.
 * @description Holds name and cookie attribute defaults.
 */
export interface SessionDefaults {
  /** Session cookie name */
  readonly name: string
  /** Mark cookie as HTTP only */
  readonly httpOnly: boolean
  /** Cookie max age in seconds */
  readonly maxAge: number
  /** Cookie path scope */
  readonly path: string
  /** Cookie SameSite policy */
  readonly sameSite: SameSitePolicy
  /** Mark cookie as secure */
  readonly secure: boolean
}

/**
 * WebSocket upgrade middleware options.
 * @description Configures listener path, origin policy, and lifecycle callbacks.
 */
export interface WebSocketOptions {
  /** Allowed handshake origins or wildcard */
  readonly allowedOrigins?: readonly string[] | '*'
  /** Path prefix that triggers an upgrade */
  readonly listener?: string
  /** Called on socket connection open */
  readonly onConnect?: SocketCallback<Event>
  /** Called on socket connection close */
  readonly onDisconnect?: SocketCallback<CloseEvent>
  /** Called on socket error event */
  readonly onError?: SocketCallback<Event>
  /** Called on incoming socket message */
  readonly onMessage?: SocketCallback<MessageEvent>
}

/**
 * CSRF rule predicate function.
 * @description Validates value against request context.
 * @param value - Header value to validate
 * @param ctx - Request context instance
 * @returns True when value is allowed
 */
export type CsrfRulePredicate = (value: string, ctx: Context) => boolean

/** Security header configuration key */
export type SecurityHeaderKey =
  | 'contentSecurityPolicy'
  | 'crossOriginEmbedderPolicy'
  | 'crossOriginOpenerPolicy'
  | 'crossOriginResourcePolicy'
  | 'originAgentCluster'
  | 'referrerPolicy'
  | 'strictTransportSecurity'
  | 'xContentTypeOptions'
  | 'xDnsPrefetchControl'
  | 'xDownloadOptions'
  | 'xFrameOptions'
  | 'xPermittedCrossDomainPolicies'

/** Security header value or disable flag */
export type SecurityHeaderValue = string | false

/** Security headers middleware options map */
export type SecurityHeadersOptions = Partial<Record<SecurityHeaderKey, SecurityHeaderValue>>

/** Session data key value record */
export type SessionData = Record<string, unknown>

/** Session decode success or failure result */
export type SessionDecodeResult =
  | { readonly data: SessionData }
  | { readonly reason: SessionInvalidReason }

/** Session options with required secret */
export type SessionOptions = { readonly secret: string } & Partial<SessionDefaults>

/**
 * Socket lifecycle callback function.
 * @description Receives the socket, originating event, and request context.
 * @template E - Event subtype delivered to the callback
 * @param socket - WebSocket connection instance
 * @param event - Event emitted by the socket
 * @param ctx - Request context instance
 */
export type SocketCallback<E extends Event = Event> = (
  socket: WebSocket,
  event: E,
  ctx: Context
) => void

// ───────────────────────── interfaces/Routing.ts ─────────────────────────

/**
 * Scoped middleware registration entry.
 * @description Pairs path prefix with middleware handler.
 */
export interface MiddlewareEntry {
  /** Path prefix scoping the middleware */
  readonly path: string
  /** Middleware handler function */
  readonly handler: MiddlewareFn
}

/**
 * Mutable per request state holder.
 * @description Carries context, error, URL, and pattern.
 */
export interface RequestHolder {
  /** Active request context or null */
  ctx: Context | null
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
  readonly handler: RouteHandler
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
  readonly handler: StaticFn
}

/**
 * Deno server request handler.
 * @description Handles request and returns response promise.
 * @param req - Incoming request instance
 * @param info - Optional Deno serve handler info
 * @returns Promise resolving to response
 */
export type ServeHandler = (req: Request, info?: Deno.ServeHandlerInfo) => Promise<Response>

// ───────────────────────── Public values: Context class ─────────────────────────

/**
 * Per request context object.
 * @description Exposes request reading and response building helpers.
 */
export class Context {
  /** Frozen request reading helpers */
  get get(): GetHelpers
  /** Frozen response setting helpers */
  get set(): SetHelpers
  /** Frozen response sending helpers */
  get send(): SendHelpers

  /**
   * Build error response from handler.
   * @description Routes through error handler then default.
   * @param statusCode - HTTP status code
   * @param error - Error instance to report
   * @returns Promise resolving to error response
   */
  handleError(statusCode: number, error: Error): Promise<Response>
  /**
   * Render template into HTML response.
   * @description Requires a configured view engine.
   * @param template - Template name to render
   * @param data - View data for template
   * @param options - Render options like status
   * @returns Promise resolving to rendered response
   * @throws When view engine is not configured
   */
  render(template: string, data?: ViewData, options?: RenderInit): Promise<Response>
}

// ───────────────────────── Public values: Validator ─────────────────────────

/**
 * Wrap a contract with guards.
 * @description Validates input then delegates to the contract.
 * @param contract - Contract function to wrap
 * @param guard - Optional guard or list of guards
 * @returns Wrapped contract function
 * @template ContractType - Contract function type
 */
declare function Define<ContractType extends ContractFn>(
  contract: ContractType,
  guard?: GuardInput<ContractType>
): ContractType

/**
 * Validator factory collection.
 * @description Exposes validation check and schema define.
 */
export const Validator: {
  /**
   * Create validation middleware from schema.
   * @param schema - Validation schema keyed by source
   * @returns Middleware function validating request data
   * @template SchemaType - Validation schema type
   */
  check<SchemaType extends ValidationSchema>(schema: SchemaType): MiddlewareFn
  /** Define a contract with optional guards */
  readonly define: typeof Define
}

// ───────────────────────── Public values: Mware factory ─────────────────────────

/**
 * Middleware factory collection.
 * @description Convenience factories for built-in middleware.
 */
export const Mware: {
  /** Basic auth middleware factory */
  basicAuth(options: BasicAuthOptions): MiddlewareFn
  /** Body size limit middleware factory */
  bodyLimit(options: BodyLimitOptions): MiddlewareFn
  /** CORS middleware factory */
  cors(options?: CorsOptions): MiddlewareFn
  /** CSRF middleware factory */
  csrf(options?: CsrfOptions): MiddlewareFn
  /** IP restriction middleware factory */
  ip(options?: IpOptions): MiddlewareFn
  /** Security headers middleware factory */
  securityHeaders(options?: SecurityHeadersOptions): MiddlewareFn
  /** Session middleware factory */
  session(options: SessionOptions): MiddlewareFn
  /** WebSocket upgrade middleware factory */
  websocket(options?: WebSocketOptions): MiddlewareFn
}

// ───────────────────────── Public values: Wrap ─────────────────────────

/**
 * Middleware error wrapper utility.
 * @description Catches errors and prefixes label to message.
 */
export const Wrap: {
  /**
   * Wrap middleware with error handling.
   * @description Catches thrown errors and routes to handler.
   * @param label - Context label for error diagnostics
   * @param middleware - Middleware function to wrap
   * @returns Wrapped middleware function
   */
  apply(label: string, middleware: MiddlewareFn): MiddlewareFn
}

// ───────────────────────── Public values: Router class ─────────────────────────

/**
 * HTTP router with file based routing.
 * @description Registers routes, middleware, and static mounts.
 */
export class Router {
  /**
   * Create router with options.
   * @description Sets routes, views, and runtime limits.
   * @param options - Router constructor options
   */
  constructor(options?: RouterOptions)
  /**
   * Set error middleware for all errors.
   * @description Runs before the default error response.
   * @param handler - Error middleware to register
   */
  catch(handler: ErrorMiddleware): void
  /**
   * Subscribe to lifecycle events.
   * @description Listener receives every emitted event.
   * @param listener - Callback invoked for each event
   * @returns Unsubscribe function
   */
  on(listener: EventFn): () => void
  /**
   * Scan routes and start HTTP server.
   * @description Serves on port and host until aborted.
   * @param port - Port number, env PORT or 8000
   * @param hostname - Host, default 0.0.0.0
   * @param signal - Optional abort to stop server
   * @returns Promise resolving when server stops
   */
  serve(port?: number, hostname?: string, signal?: AbortSignal): Promise<void>
  /**
   * Register static mount at URL path.
   * @description Serves files from source under urlPath.
   * @param urlPath - URL prefix for static files
   * @param source - Static handler or serve options
   */
  static(urlPath: string, source: StaticFn | ServeOptions): void
  /**
   * Add global or path scoped middleware.
   * @description Scopes middleware to a path prefix when given.
   * @param handlers - One or more middleware functions
   */
  use(...handlers: MiddlewareFn[]): void
  use(path: string, ...handlers: MiddlewareFn[]): void
}
