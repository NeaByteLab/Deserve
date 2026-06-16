import type * as Types from '@interfaces/index.ts'
import type * as Core from '@core/index.ts'

/** Basic Auth middleware options. */
export interface BasicAuthOptions {
  /** Allowed user credentials list */
  readonly users: readonly BasicAuthUser[]
}

/** Single Basic Auth user credential. */
export interface BasicAuthUser {
  /** Login username string */
  readonly username: string
  /** Login password string */
  readonly password: string
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
  readonly methods?: readonly Types.HttpMethod[]
  /** Allowed origin or origin list */
  readonly origin?: string | readonly string[]
}

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

/** Middleware bound to optional path. */
export interface MiddlewareEntry {
  /** Middleware handler function */
  readonly handler: MiddlewareFn
  /** Path prefix to match */
  readonly path: string
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

/** Async-resolved middleware result promise. */
export type AsyncMiddlewareResult = Promise<Awaited<MiddlewareResult>>

/**
 * CSRF rule predicate over a header value.
 * @description Returns true when the value is allowed.
 * @param value - Incoming header value to test
 * @param ctx - Request context instance
 * @returns True when the value passes the rule
 */
export type CsrfRulePredicate = (value: string, ctx: Core.Context) => boolean

/**
 * Middleware function with context.
 * @description Processes request with context and next chain.
 */
export type MiddlewareFn = Types.ContextFn<[next: NextFn], Response | undefined>

/** Middleware return type alias. */
export type MiddlewareResult = ReturnType<MiddlewareFn>

/** Next function in middleware chain. */
export type NextFn = () => AsyncMiddlewareResult

/** Route handler receiving context. */
export type RouteHandler = Types.ContextFn<[], Response>

/** SameSite cookie attribute value. */
export type SameSitePolicy = 'Strict' | 'Lax' | 'None'

/** Derived security header option key union. */
export type SecurityHeaderKey = keyof typeof Core.Constant.securityHeaders

/** Header value or false to omit. */
export type SecurityHeaderValue = string | false

/** Security header partial options map. */
export type SecurityHeadersOptions = Partial<Record<SecurityHeaderKey, SecurityHeaderValue>>

/** Session cookie options all required. */
export type SessionCookieOpts = Required<Omit<SessionOptions, 'cookieSecret'>>

/** Decoded signed session cookie result. */
export type SessionDecodeResult =
  | { readonly data: Types.DataRecord }
  | { readonly reason: 'tampered' | 'expired' | 'malformed' }

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
  ctx: Core.Context
) => void
