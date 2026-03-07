import type { Context } from '@app/index.ts'

/** Basic Auth middleware options. */
export interface BasicAuthOptions {
  /** Allowed username/password pairs */
  users: BasicAuthUser[]
}

/** Single Basic Auth user credential. */
export interface BasicAuthUser {
  /** Login name */
  username: string
  /** Password */
  password: string
}

/** Body size limit middleware options. */
export interface BodyLimitOptions {
  /** Max body size in bytes */
  limit: number
}

/** CORS middleware options. */
export interface CorsOptions {
  /** Allowed origin(s) or '*' */
  origin?: string | string[]
  /** Allowed methods */
  methods?: string[]
  /** Allowed request headers */
  allowedHeaders?: string[]
  /** Headers exposed to client */
  exposedHeaders?: string[]
  /** Allow credentials */
  credentials?: boolean
  /** Preflight cache max-age in seconds */
  maxAge?: number
}

/** Handler for route or middleware errors. */
export type ErrorHandler = (
  ctx: Context,
  statusCode: number,
  error: Error
) => Response | Promise<Response>

/** Custom handler before default error response. */
export type ErrorMiddleware = (
  ctx: Context,
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
    ctx: Context,
    statusCode: number,
    error: Error,
    errorMiddleware: ErrorMiddleware | null
  ): Promise<Response>
}

/** Handler options: error, static, request timeout. */
export interface HandlerOptions {
  /** Custom error response builder */
  errorResponseBuilder?: ErrorResponseBuilder
  /** Custom static file handler */
  staticHandler?: StaticHandler
  /** Request timeout in ms; 503 on timeout when set */
  requestTimeoutMs?: number
}

/**
 * Middleware function with context and next.
 * @description Must call next() or return Response; otherwise the request may hang.
 */
export type Middleware = (
  ctx: Context,
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
export type RouteHandler = (context: Context) => Response | Promise<Response>

/** Route match result: handler and pattern. */
export interface RouteMetadata {
  /** Route or static file handler */
  handler: RouteHandler | StaticFileHandler
  /** Path pattern used for matching */
  pattern: string
}

/** Router constructor and serve options. */
export interface RouterOptions {
  /** Directory path for file-based routes */
  routesDir?: string
  /** Custom error response builder */
  errorResponseBuilder?: ErrorResponseBuilder
  /** Custom static file handler */
  staticHandler?: StaticHandler
  /** Request timeout in ms; 503 on timeout when set */
  requestTimeoutMs?: number
}

/** Maps option key to header name. */
export interface SecurityHeaderEntry {
  /** Key in SecurityHeadersOptions */
  key: keyof SecurityHeadersOptions
  /** HTTP header name */
  name: string
}

/** Security header options; false to omit. */
export interface SecurityHeadersOptions {
  /** Content-Security-Policy value */
  contentSecurityPolicy?: string | false
  /** Cross-Origin-Embedder-Policy value */
  crossOriginEmbedderPolicy?: string | false
  /** Cross-Origin-Opener-Policy value */
  crossOriginOpenerPolicy?: string | false
  /** Cross-Origin-Resource-Policy value */
  crossOriginResourcePolicy?: string | false
  /** Origin-Agent-Cluster value */
  originAgentCluster?: string | false
  /** Referrer-Policy value */
  referrerPolicy?: string | false
  /** Strict-Transport-Security value */
  strictTransportSecurity?: string | false
  /** X-Content-Type-Options value */
  xContentTypeOptions?: string | false
  /** X-DNS-Prefetch-Control value */
  xDnsPrefetchControl?: string | false
  /** X-Download-Options value */
  xDownloadOptions?: string | false
  /** X-Frame-Options value */
  xFrameOptions?: string | false
  /** X-Permitted-Cross-Domain-Policies value */
  xPermittedCrossDomainPolicies?: string | false
  /** X-Powered-By value */
  xPoweredBy?: string | false
}

/** Helpers on context for sending responses. */
export type SendHelpers = {
  /** Custom body and ResponseInit */
  custom: (body: BodyInit | null, options?: ResponseInit) => Response
  /** Binary or string as attachment */
  data: (
    data: Uint8Array | string,
    filename: string,
    options?: ResponseInit,
    contentType?: string
  ) => Response
  /** File from path as attachment */
  file: (filePath: string, filename?: string, options?: ResponseInit) => Promise<Response>
  /** HTML string response */
  html: (html: string, options?: ResponseInit) => Response
  /** JSON-serialized response */
  json: (data: unknown, options?: ResponseInit) => Response
  /** Redirect to URL with status */
  redirect: (url: string, status?: number) => Response
  /** ReadableStream with optional content type */
  stream: (stream: ReadableStream, options?: ResponseInit, contentType?: string) => Response
  /** Plain text response */
  text: (text: string, options?: ResponseInit) => Response
}

/** Options for static file serving. */
export interface ServeOptions {
  /** File system path for static root */
  path: string
  /** Enable ETag generation and 304 */
  etag?: boolean
  /** Max-age in seconds for Cache-Control */
  cacheControl?: number
}

/** Session cookie options, all required. */
export type SessionCookieOpts = Required<
  Pick<SessionOptions, 'cookieName' | 'maxAge' | 'path' | 'sameSite' | 'httpOnly'>
>

/** Session payload stored in cookie. */
export type SessionData = Record<string, unknown>

/**
 * Session middleware cookie options.
 * @description Cookie name, lifetime, path, and signing secret.
 */
export interface SessionOptions {
  /** Signing secret for cookie payload, required (HMAC-SHA256) */
  cookieSecret: string
  /** Cookie name */
  cookieName?: string
  /** Max age in seconds */
  maxAge?: number
  /** Cookie path */
  path?: string
  /** SameSite attribute */
  sameSite?: 'Strict' | 'Lax' | 'None'
  /** HttpOnly flag */
  httpOnly?: boolean
}

/** Static route handler descriptor. */
export type StaticFileHandler = {
  /** Marks this as a static route */
  staticRoute: true
  /** URL path prefix for static files */
  urlPath: string
  /** Executes static serve for the request */
  execute: (ctx: Context) => Promise<Response>
}

/**
 * Serves static files from path.
 * @description Handles file resolution and response.
 */
export interface StaticHandler {
  /** Serves one static file for URL path. */
  serve(ctx: Context, options: ServeOptions, urlPath: string): Promise<Response>
}

/** WebSocket upgrade middleware options. */
export interface WebSocketOptions {
  /** Path prefix that triggers upgrade */
  listener?: string
  /** Called when socket opens */
  onConnect?: (socket: WebSocket, ctx: Context) => void
  /** Called on each message */
  onMessage?: (socket: WebSocket, event: MessageEvent, ctx: Context) => void
  /** Called when socket closes */
  onDisconnect?: (socket: WebSocket, ctx: Context) => void
  /** Called on socket error */
  onError?: (socket: WebSocket, event: Event, ctx: Context) => void
}

/** Middleware result: Response or undefined. */
type MiddlewareResult = Response | undefined
