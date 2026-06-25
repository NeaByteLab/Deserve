import type * as Types from '@interfaces/index.ts'
import type * as Core from '@core/index.ts'

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
  readonly methods?: readonly Types.HttpMethod[]
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
  readonly sameSite: Types.SameSitePolicy
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
export type CsrfRulePredicate = (value: string, ctx: Core.Context) => boolean

/** Security header configuration key */
export type SecurityHeaderKey = keyof typeof Core.Constant.securityHeaders

/** Security header value or disable flag */
export type SecurityHeaderValue = string | false

/** Security headers middleware options map */
export type SecurityHeadersOptions = Partial<Record<SecurityHeaderKey, SecurityHeaderValue>>

/** Session data key value record */
export type SessionData = Record<string, unknown>

/** Session decode success or failure result */
export type SessionDecodeResult =
  | { readonly data: SessionData }
  | { readonly reason: Types.SessionInvalidReason }

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
  ctx: Core.Context
) => void
