/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="esnext" />
// Real module shim for Twoslash docs samples, mapped to `@neabyte/deserve` via
// compilerOptions.paths. Using a real module (not `declare module`) ensures the
// copied JSDoc shows up in hover popups. Keep in sync with src/index.ts.

// ───────────────────────── Core: value/string types ─────────────────────────

/** Generic string-keyed data record. */
export type DataRecord = Record<string, unknown>

/** String-to-string key-value record. */
export type StringRecord = Record<string, string>

/** String key-value tuple pair. */
export type StringPair = [string, string]

/**
 * Sync or async value wrapper.
 * @template T - Wrapped value type
 */
export type MaybeAsync<T> = T | Promise<T>

/**
 * Branded key for state access.
 * @template T - Value type stored under key
 */
export type StateKey<T> = string & { readonly __stateValue: T }

/** HTTP method literal union. */
export type HttpMethod = 'DELETE' | 'GET' | 'HEAD' | 'OPTIONS' | 'PATCH' | 'POST' | 'PUT'

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

/** 5xx server error status codes. */
export type ServerErrorCode = 500 | 501 | 502 | 503 | 504

/** HTTP status code branded type. */
export type HttpStatusCode = ClientErrorCode | ServerErrorCode

/** Valid HTTP redirect status codes. */
export type RedirectStatus = 301 | 302 | 303 | 307 | 308

/** Optional headers for redirect init. */
export type RedirectInit = Pick<ResponseInit, 'headers'>

/** Body format the request parsed. */
export type BodyParsedFormat = 'arraybuffer' | 'blob' | 'form' | 'json' | 'text'

/** Error with attached HTTP status code. */
export type StatusError = Error & { statusCode: number }

/**
 * Carrier of an HTTP status code.
 * @description Single atom for status-bearing values; widen via S.
 * @template S - Confidence of the statusCode value
 */
export type StatusCarrier<S = number> = { readonly statusCode: S }

/** Error-like object with unknown statusCode property. */
export type StatusCodeCarrier = StatusCarrier<unknown>

/** Matcher predicate for an IP string. */
export type IpMatcher = (ip: string) => boolean

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
  & { readonly [P in Tag]: K }
  & Readonly<Shape>

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

// ───────────────────────── Core: response + error info ─────────────────────────

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

/** Extracted status code and error. */
export type ExtractedError = Pick<ErrorInfo, 'statusCode' | 'error'>

// ───────────────────────── Core: Context class ─────────────────────────

/**
 * Per-request context object.
 * @description Wraps the incoming request, route params, response helpers,
 * and userland state for a single HTTP request.
 */
export class Context {
  /** Direct TCP peer IP address */
  get directIp(): string | undefined
  /** Raw request Headers */
  get headers(): Headers
  /** Resolved client IP address */
  get ip(): string | undefined
  /** Request pathname from URL */
  get pathname(): string
  /** Raw Request object */
  get request(): Request
  /** Send helpers for response building */
  get send(): SendHelpers
  /** Shared mutable userland request state */
  get state(): DataRecord
  /** Full request URL string */
  get url(): string

  /** Read body as ArrayBuffer */
  arrayBuffer(): Promise<ArrayBuffer>
  /** Read body as Blob */
  blob(): Promise<Blob>
  /** Read body by content type */
  body(): Promise<unknown>
  /**
   * Get cookie by key or all.
   * @description Parses Cookie header on first access.
   * @param key - Cookie name
   * @returns Cookie value or undefined
   */
  cookie(): StringRecord
  cookie(key: string): string | undefined
  /** Read body as FormData */
  formData(): Promise<FormData>
  /**
   * Get typed state value.
   * @description Type-safe alternative to `state[key] as T`.
   * @template T - Value type encoded in the key
   * @param key - Branded state key
   * @returns Typed value or undefined
   */
  getState<T>(key: StateKey<T>): T | undefined
  /**
   * Build error response via handler.
   * @description Uses errorHandler if set else custom response.
   * @param statusCode - HTTP status code
   * @param error - Error instance
   * @returns Error response
   */
  handleError(statusCode: number, error: Error): Promise<Response>
  /**
   * Get header by name.
   * @description Parses headers on first access, keys lowercased.
   * @param key - Header name
   * @returns Header value or undefined
   */
  header(): StringRecord
  header(key: string): string | undefined
  /** Read body as JSON */
  json(): Promise<unknown>
  /**
   * Get single route param by key.
   * @description Returns one named param from route match.
   * @param key - Param name from pattern
   * @returns Param value or undefined
   */
  param(key: string): string | undefined
  /** Get all route path params */
  params(): StringRecord
  /**
   * Get all values for query key.
   * @description Returns all query values for repeated key.
   * @param key - Query parameter name
   * @returns Array of values
   */
  queries(key: string): string[]
  /**
   * Get query param by key.
   * @description Parses search params on first access.
   * @param key - Query key
   * @returns Query value or undefined
   */
  query(): StringRecord
  query(key: string): string | undefined
  /**
   * Redirect response to a URL.
   * @description Wraps `ctx.send.redirect` with same builder.
   * @param url - Target URL (relative same-origin or explicit absolute http(s))
   * @param status - Redirect status code, defaults to 302
   * @param options - Optional extra headers
   * @returns Redirect Response with Location header
   */
  redirect(url: string, status?: RedirectStatus, options?: RedirectInit): Response
  /**
   * Render template and return HTML response.
   * @description Requires viewsDir set in Router, uses ctx.state.view.
   * @param templatePath - Path to .dve template relative to viewsDir
   * @param data - Data for template
   * @returns Response with rendered HTML
   */
  render(templatePath: string, data?: DataRecord): Promise<Response>
  /**
   * Set one response header.
   * @description Merges one header into response headers.
   * @param key - Header name
   * @param value - Header value
   * @returns this for chaining
   */
  setHeader(key: string, value: string): this
  /**
   * Set multiple response headers.
   * @description Merges headers into response headers.
   * @param headers - Key-value map of headers
   * @returns this for chaining
   */
  setHeaders(headers: StringRecord): this
  /**
   * Set typed state value.
   * @description Type-safe alternative to `state[key] = value`.
   * @template T - Value type encoded in the key
   * @param key - Branded state key
   * @param value - Value matching the key's type
   * @throws {StatusError} When the key is a reserved framework key
   */
  setState<T>(key: StateKey<T>, value: T): void
  /**
   * Render template with streaming.
   * @description Requires viewsDir set in Router, validates before committing.
   * @param templatePath - Path to .dve template relative to viewsDir
   * @param data - Data for template
   * @returns Response with streaming HTML
   */
  streamRender(templatePath: string, data?: DataRecord): Promise<Response>
  /** Read body as plain text */
  text(): Promise<string>
}

// ───────────────────────── Core: handler/middleware function types ─────────────────────────

/**
 * Context-receiving function type.
 * @description Generic for handlers that take context and return R.
 * @template Args - Additional argument types after context
 * @template R - Return type wrapped in MaybeAsync
 */
export type ContextFn<Args extends readonly unknown[], R> = (
  ctx: Context,
  ...args: Args
) => MaybeAsync<R>

/** Route handler receiving context. */
export type RouteHandler = ContextFn<[], Response>

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

/** Next function in middleware chain. */
export type NextFn = () => AsyncMiddlewareResult

/**
 * Middleware function with context.
 * @description Processes request with context and next chain.
 */
export type MiddlewareFn = ContextFn<[next: NextFn], Response | undefined>

/** Middleware return type alias. */
export type MiddlewareResult = ReturnType<MiddlewareFn>

/** Async-resolved middleware result promise. */
export type AsyncMiddlewareResult = Promise<Awaited<MiddlewareResult>>

/** SameSite cookie attribute value. */
export type SameSitePolicy = 'Strict' | 'Lax' | 'None'

// ───────────────────────── Middleware: option shapes ─────────────────────────

/** Single Basic Auth user credential. */
export interface BasicAuthUser {
  /** Login username string */
  readonly username: string
  /** Login password string */
  readonly password: string
}

/** Basic Auth middleware options. */
export interface BasicAuthOptions {
  /** Allowed user credentials list */
  readonly users: readonly BasicAuthUser[]
}

/** Body size limit middleware options. */
export interface BodyLimitOptions {
  /** Maximum body size in bytes */
  readonly limit: number
}

/** CORS middleware options. */
export interface CorsOptions {
  /** Allowed request header names */
  readonly allowedHeaders?: readonly string[]
  /** Allow credentials in requests */
  readonly credentials?: boolean
  /** Headers exposed to client scripts */
  readonly exposedHeaders?: readonly string[]
  /** Preflight cache duration in seconds */
  readonly maxAge?: number
  /** Allowed HTTP methods for CORS */
  readonly methods?: readonly HttpMethod[]
  /** Allowed origin or origin list */
  readonly origin?: string | readonly string[]
}

/**
 * CSRF rule predicate over a header value.
 * @description Returns true when the value is allowed.
 * @param value - Incoming header value to test
 * @param ctx - Request context instance
 * @returns True when the value passes the rule
 */
export type CsrfRulePredicate = (value: string, ctx: Context) => boolean

/** CSRF middleware options. */
export interface CsrfOptions {
  /** Allowed origin, list, or predicate */
  readonly origin?: string | readonly string[] | CsrfRulePredicate
  /** Allowed sec-fetch-site, list, or predicate */
  readonly secFetchSite?: string | readonly string[] | CsrfRulePredicate
}

/** IP restriction middleware options. */
export interface IpOptions {
  /** Allowed IP, CIDR, or wildcard rules */
  readonly whitelist?: readonly string[]
  /** Denied IP, CIDR, or wildcard rules */
  readonly blacklist?: readonly string[]
}

/** Session middleware cookie options. */
export interface SessionOptions {
  /** Session cookie name */
  readonly cookieName?: string
  /** Secret key for cookie signing */
  readonly cookieSecret: string
  /** Restrict cookie to HTTP only */
  readonly httpOnly?: boolean
  /** Cookie expiry in seconds */
  readonly maxAge?: number
  /** Cookie path scope */
  readonly path?: string
  /** SameSite cookie policy attribute */
  readonly sameSite?: SameSitePolicy
  /** Require HTTPS for cookie */
  readonly secure?: boolean
}

/** Security header partial options map. */
export type SecurityHeadersOptions = Partial<Record<string, string | false>>

/**
 * Socket lifecycle callback with event.
 * @description Handles WebSocket events with socket and context.
 * @template E - Event subtype constraint
 * @param socket - WebSocket connection instance
 * @param event - DOM event from socket
 * @param ctx - Request context instance
 */
export type SocketCallback<E extends Event = Event> = (
  socket: WebSocket,
  event: E,
  ctx: Context
) => void

/** WebSocket upgrade middleware options. */
export interface WebSocketOptions {
  /** Allowed handshake origins or wildcard */
  readonly allowedOrigins?: readonly string[] | '*'
  /** Listener event name override */
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

// ───────────────────────── Rendering / worker ─────────────────────────

/** Worker pool creation options. */
export interface WorkerPoolOptions {
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

/**
 * View engine for templates.
 * @description Renders templates to string or readable stream.
 */
export interface ViewEngine {
  /**
   * Render template to string.
   * @param templatePath - Path to template file
   * @param data - Template data record
   * @returns Promise resolving to rendered HTML
   */
  render(templatePath: string, data?: DataRecord): Promise<string>
  /**
   * Render template to readable stream.
   * @param templatePath - Path to template file
   * @param data - Template data record
   * @returns Promise resolving to a ReadableStream of rendered output
   */
  streamRender(templatePath: string, data?: DataRecord): Promise<ReadableStream>
}

// ───────────────────────── Routing: static + router options ─────────────────────────

/** Static file serving options. */
export interface ServeOptions {
  /** Cache-Control max-age in seconds */
  readonly cacheControl?: number
  /** Enable ETag header generation */
  readonly etag?: boolean
  /** Filesystem path to static directory */
  readonly path: string
}

/** Trusted proxy configuration for IP resolution. */
export type TrustProxyConfig = readonly string[] | IpMatcher

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
    ctx: Context,
    statusCode: number,
    error: Error,
    errorMiddleware?: ErrorMiddleware | null
  ): Promise<Response>
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
  serve(ctx: Context, options: ServeOptions, urlPath: string): Promise<Response>
}

/** Router constructor and serve options. */
export interface RouterOptions {
  /** Directory path for route modules */
  readonly routesDir?: string
  /** Custom error response builder */
  readonly errorResponseBuilder?: ErrorResponseBuilder
  /** Maximum route parameter length */
  readonly maxParamLength?: number
  /** Maximum request URL length */
  readonly maxUrlLength?: number
  /** Request timeout in milliseconds */
  readonly requestTimeoutMs?: number
  /** Static file handler instance */
  readonly staticHandler?: StaticHandler
  /** Trusted proxy configuration for IP resolution */
  readonly trustProxy?: TrustProxyConfig
  /** Directory path for template views */
  readonly viewsDir?: string
  /** Maximum loop iterations per #each block */
  readonly maxIterations?: number
  /** Maximum #each body executions per render */
  readonly maxRenderIterations?: number
  /** Maximum total output characters per render */
  readonly maxOutputSize?: number
  /** Worker pool configuration options */
  readonly worker?: WorkerPoolOptions
}

/** Allowed route module file extensions. */
export type RouteFileExtension = 'cjs' | 'js' | 'jsx' | 'mjs' | 'ts' | 'tsx'

// ───────────────────────── Observability: events ─────────────────────────

/** Origin channel of an event. */
export type EventChannel = 'internal' | 'external'

/**
 * Lifecycle event envelope with metadata.
 * @description Pairs a kind discriminant with its readonly metadata.
 * @template Kind - Event kind discriminant literal
 * @template Metadata - Event-specific metadata shape
 */
export type LifecycleEvent<Kind extends string, Metadata> = {
  /** Origin channel of the event */
  readonly type: EventChannel
  /** Event kind discriminant value */
  readonly kind: Kind
  /** Readonly event-specific metadata */
  readonly metadata: Readonly<Metadata>
  /** Creation time in epoch milliseconds */
  readonly timestamp: number
}

/**
 * Discriminated union of lifecycle events.
 * @description Discriminated by kind, with fields under metadata.
 */
export type EventBase =
  | LifecycleEvent<'server:listening', { port: number; hostname: string }>
  | LifecycleEvent<'server:shutdown', Record<never, never>>
  | LifecycleEvent<
    'route:loaded' | 'route:reloaded' | 'route:removed',
    { routePath: string; pattern: string }
  >
  | LifecycleEvent<'route:skipped', { routePath: string; reason: string }>
  | LifecycleEvent<'route:error' | 'reload:error', { routePath: string; error: Error }>
  | LifecycleEvent<
    'process:error',
    { error: Error; origin: 'unhandledrejection' | 'uncaughterror' | 'process:exit' }
  >
  | LifecycleEvent<'view:compiled' | 'view:rendered', { path: string; durationMs: number }>
  | LifecycleEvent<'view:refreshed', { paths: readonly string[] }>
  | LifecycleEvent<'view:error', { path: string; error: Error }>
  | LifecycleEvent<
    'request:complete' | 'request:error',
    {
      method: string
      statusCode: number
      url: string
      durationMs: number
      ip?: string
      error?: Error
    }
  >
  | LifecycleEvent<'worker:timeout', { workerIndex: number; timeoutMs: number; error: Error }>
  | LifecycleEvent<'worker:crash', { workerIndex: number; error: Error }>
  | LifecycleEvent<'worker:respawn', { workerIndex: number }>
  | LifecycleEvent<
    'worker:rejected',
    { reason: 'queue-depth' | 'queue-wait'; queueDepth: number; maxQueueDepth: number }
  >
  | LifecycleEvent<
    'session:invalid',
    { cookieName: string; reason: 'tampered' | 'expired' | 'malformed' }
  >
  | LifecycleEvent<'csrf:rule-error', { rule: 'origin' | 'secFetchSite'; error: Error }>

/** Discriminant value of a lifecycle event. */
export type EventKind = EventBase['kind']

/**
 * Event member selected by kind.
 * @description Distributes over the union to keep grouped kinds.
 * @template Kind - Event kind discriminant literal
 */
export type EventByKind<Kind extends EventKind> = EventBase extends infer Member
  ? Member extends { kind: infer MemberKind } ? Kind extends MemberKind ? Member : never
  : never
  : never

/** Emit function passed into internal subsystems. */
export type EventEmit = (event: EventBase) => void

/** Listener invoked for emitted events. */
export type EventListener = (event: EventBase) => void

// ───────────────────────── Prebuilt middleware factory ─────────────────────────

/**
 * Prebuilt middleware factories.
 * @description Common middleware creators for auth, CORS, session.
 */
export const Mware: {
  /** Basic Auth middleware factory */
  basicAuth(options: BasicAuthOptions): MiddlewareFn
  /** Body size limit middleware factory */
  bodyLimit(options: BodyLimitOptions): MiddlewareFn
  /** CORS middleware factory */
  cors(options?: CorsOptions): MiddlewareFn
  /** CSRF middleware factory */
  csrf(options?: CsrfOptions): MiddlewareFn
  /** IP restriction middleware factory */
  ip(options: IpOptions): MiddlewareFn
  /** Security headers middleware factory */
  securityHeaders(options?: SecurityHeadersOptions): MiddlewareFn
  /** Session middleware factory */
  session(options: SessionOptions): MiddlewareFn
  /** WebSocket upgrade middleware factory */
  websocket(options?: WebSocketOptions): MiddlewareFn
}

/**
 * Wrap middleware with try/catch and label.
 * @description Catches errors and calls ctx.handleError, preserves original error.
 * @param label - Context label for error diagnostics
 * @param middleware - Middleware to run
 * @returns Middleware that delegates and catches
 */
export function WrapMware(label: string, middleware: MiddlewareFn): MiddlewareFn

// ───────────────────────── Routing: Router class ─────────────────────────

/**
 * HTTP router with file-based routing.
 * @description Registers routes, middleware, static files, and serves them.
 */
export class Router {
  /**
   * Create router with routes and options.
   * @description Sets Handler options and routes directory.
   * @param options - Routes dir, error builder, static handler, worker pool
   */
  constructor(options?: RouterOptions)
  /**
   * Set error middleware for all errors.
   * @description Replaces or adds error handler before default response.
   * @param errorHandler - Function receiving ctx and error info
   */
  catch(errorHandler: ErrorMiddleware): void
  /**
   * Subscribe to lifecycle and error events.
   * @description Listener receives every event, filter via event.type.
   * @param listener - Callback invoked for each event
   * @returns Unsubscribe function
   */
  on(listener: EventListener): () => void
  /**
   * Scan routes and start HTTP server.
   * @description Serves on port/host, optional AbortSignal for shutdown.
   * @param port - Port number, env PORT or 8000
   * @param hostname - Host, default 0.0.0.0
   * @param signal - Optional abort to stop server
   */
  serve(port?: number, hostname?: string, signal?: AbortSignal): Promise<void>
  /**
   * Register static route at URL path.
   * @description Serves files from options.path under urlPath.
   * @param urlPath - URL prefix for static files
   * @param options - Path, etag, cacheControl
   */
  static(urlPath: string, options: ServeOptions): void
  /**
   * Add global or path-scoped middleware.
   * @description Scopes middleware to path prefix when string given.
   * @param handlers - One or more middleware functions
   */
  use(...handlers: MiddlewareFn[]): void
  use(path: string, ...handlers: MiddlewareFn[]): void
}
