import type { Context, Middleware, Types } from '@app/index.ts'

/**
 * Cookie-based session middleware.
 * @description Puts session data and set/clear helpers in ctx.state.
 */
export default class Session {
  /** Default cookie name, maxAge, path, sameSite, httpOnly */
  private static readonly defaultOptions: Types.SessionCookieOpts = {
    cookieName: 'session',
    maxAge: 86400,
    path: '/',
    sameSite: 'Lax',
    httpOnly: true
  }

  /**
   * Create session middleware.
   * @description Puts session and set/clear helpers in ctx.state.
   * @param options - Cookie name, maxAge, path, sameSite, httpOnly
   * @returns Middleware that populates ctx.state.session
   */
  static create(options: Types.SessionOptions = {}): Middleware {
    const sessionOptions = { ...Session.defaultOptions, ...options }
    return async (
      ctx: Context,
      next: () => Promise<Response | undefined>
    ): Promise<Response | undefined> => {
      const rawCookie = ctx.cookie(sessionOptions.cookieName)
      const cookieValue = typeof rawCookie === 'string' ? rawCookie : undefined
      ctx.state['session'] = cookieValue ? Session.decodePayload(cookieValue) : null
      ctx.state['setSession'] = (data: Types.SessionData) => {
        const encodedPayload = Session.encodePayload(data)
        ctx.setHeader(
          'Set-Cookie',
          Session.buildSetCookieHeader(sessionOptions.cookieName, encodedPayload, sessionOptions)
        )
      }
      ctx.state['clearSession'] = () => {
        ctx.setHeader(
          'Set-Cookie',
          Session.buildClearCookieHeader(sessionOptions.cookieName, sessionOptions.path)
        )
      }
      return await next()
    }
  }

  /**
   * Build Set-Cookie header to clear session.
   * @description Returns header string with Max-Age=0 for given name and path.
   * @param cookieName - Cookie name to clear
   * @param path - Cookie path
   * @returns Set-Cookie header string
   */
  private static buildClearCookieHeader(cookieName: string, path: string): string {
    return `${encodeURIComponent(cookieName)}=; Path=${path}; Max-Age=0`
  }

  /**
   * Build Set-Cookie header with value and opts.
   * @description Joins name, value, Path, Max-Age, SameSite, HttpOnly.
   * @param name - Cookie name
   * @param value - Encoded payload
   * @param opts - Path, maxAge, sameSite, httpOnly
   * @returns Set-Cookie header string
   */
  private static buildSetCookieHeader(
    name: string,
    value: string,
    opts: Types.SessionCookieOpts
  ): string {
    const parts = [
      `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
      `Path=${opts.path}`,
      `Max-Age=${opts.maxAge}`,
      `SameSite=${opts.sameSite}`
    ]
    if (opts.httpOnly) {
      parts.push('HttpOnly')
    }
    return parts.join('; ')
  }

  /**
   * Decode base64+JSON session payload.
   * @description Decodes cookie value; returns null on parse error.
   * @param encodedValue - Base64-encoded session string
   * @returns Session data or null
   */
  private static decodePayload(encodedValue: string): Types.SessionData | null {
    try {
      const base64Value = encodedValue.includes('%')
        ? decodeURIComponent(encodedValue)
        : encodedValue
      const decodedInner = atob(base64Value)
      return JSON.parse(decodeURIComponent(decodedInner)) as Types.SessionData
    } catch {
      return null
    }
  }

  /**
   * Encode session data as base64+JSON string.
   * @description JSON.stringify then encodeURIComponent then btoa.
   * @param sessionData - Session object to encode
   * @returns Base64-encoded string
   */
  private static encodePayload(sessionData: Types.SessionData): string {
    return btoa(encodeURIComponent(JSON.stringify(sessionData)))
  }
}
