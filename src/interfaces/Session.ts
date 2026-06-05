/**
 * Session middleware cookie options.
 * @description Cookie name, lifetime, path, and signing secret.
 */
export interface SessionOptions {
  /** Cookie name */
  readonly cookieName?: string
  /** HMAC-SHA256 signing secret, min 32 chars */
  readonly cookieSecret: string
  /** HttpOnly flag */
  readonly httpOnly?: boolean
  /** Max age in seconds */
  readonly maxAge?: number
  /** Cookie path */
  readonly path?: string
  /** SameSite attribute */
  readonly sameSite?: SameSitePolicy
  /** Secure flag for HTTPS only */
  readonly secure?: boolean
}

/** SameSite cookie attribute. */
export type SameSitePolicy = 'Strict' | 'Lax' | 'None'

/** Session cookie options, all required. */
export type SessionCookieOpts = Required<
  Pick<SessionOptions, 'cookieName' | 'maxAge' | 'path' | 'sameSite' | 'httpOnly' | 'secure'>
>
