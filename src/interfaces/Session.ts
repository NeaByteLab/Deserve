/**
 * Session middleware cookie options.
 * @description Cookie name, lifetime, path, and signing secret.
 */
export interface SessionOptions {
  /** Cookie name */
  cookieName?: string
  /** Signing secret for cookie payload, required (HMAC-SHA256) */
  cookieSecret: string
  /** HttpOnly flag */
  httpOnly?: boolean
  /** Max age in seconds */
  maxAge?: number
  /** Cookie path */
  path?: string
  /** SameSite attribute */
  sameSite?: 'Strict' | 'Lax' | 'None'
}

/** Session cookie options, all required. */
export type SessionCookieOpts = Required<
  Pick<SessionOptions, 'cookieName' | 'maxAge' | 'path' | 'sameSite' | 'httpOnly'>
>

/** Session payload stored in cookie. */
export type SessionData = Record<string, unknown>
