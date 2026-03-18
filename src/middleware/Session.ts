import type * as Types from '@interfaces/index.ts'
import type * as Core from '@core/index.ts'

/**
 * Cookie-based session middleware.
 * @description Session and set/clear in ctx.state; payload signed with HMAC.
 */
export class Session {
  /** Default cookie name, maxAge, path, sameSite, httpOnly */
  private static readonly defaultOptions: Types.SessionCookieOpts = {
    cookieName: 'session',
    maxAge: 86400,
    path: '/',
    sameSite: 'Lax',
    httpOnly: true
  }

  /**
   * Decode base64url string to bytes.
   * @description Converts base64url string to byte array.
   * @param str - Base64url-encoded string
   * @returns Decoded byte array
   */
  private static base64UrlDecode(str: string): Uint8Array {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
    const pad = base64.length % 4
    const padded = pad ? base64 + '='.repeat(4 - pad) : base64
    const binary = atob(padded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }

  /**
   * Encode bytes to base64url string.
   * @description Converts byte array to base64url, no padding.
   * @param bytes - Input byte array
   * @returns Base64url-encoded string
   */
  private static base64UrlEncode(bytes: Uint8Array): string {
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i]
      if (byte !== undefined) {
        binary += String.fromCharCode(byte)
      }
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  /**
   * Build Set-Cookie header to clear session.
   * @description Header string Max-Age=0 for name and path.
   * @param cookieName - Cookie name to clear
   * @param path - Cookie path
   * @returns Set-Cookie header string
   */
  private static buildClearCookieHeader(cookieName: string, path: string): string {
    return `${encodeURIComponent(cookieName)}=; Path=${path}; Max-Age=0`
  }

  /**
   * Build Set-Cookie header for value and opts.
   * @description Joins name value Path Max-Age SameSite HttpOnly.
   * @param name - Cookie name
   * @param value - Encoded payload
   * @param opts - Cookie opts path maxAge sameSite httpOnly
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
   * Create session middleware.
   * @description Populates ctx.state with session and helpers; requires cookieSecret.
   * @param options - Session options with required cookieSecret
   * @returns Middleware that populates ctx.state.session
   * @throws {Error} When cookieSecret is missing or empty
   */
  static create(options: Types.SessionOptions): Types.Middleware {
    const { cookieSecret, ...rest } = options
    if (!cookieSecret || cookieSecret.length === 0) {
      throw new Error('Session middleware requires cookieSecret (non-empty string)')
    }
    const sessionOptions = { ...Session.defaultOptions, ...rest } as Types.SessionCookieOpts
    return async (
      ctx: Core.Context,
      next: () => Promise<Response | undefined>
    ): Promise<Response | undefined> => {
      const rawCookie = ctx.cookie(sessionOptions.cookieName)
      const cookieValue = typeof rawCookie === 'string' ? rawCookie : undefined
      ctx.state['session'] = cookieValue
        ? await Session.decodePayload(cookieValue, cookieSecret)
        : null
      ctx.state['setSession'] = async (data: Types.SessionData) => {
        const encodedPayload = await Session.encodePayload(data, cookieSecret)
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
   * Decode and verify signed session payload.
   * @description Returns null on parse error or invalid signature.
   * @param encodedValue - Cookie value payload dot signature base64url
   * @param secret - Secret for HMAC verification
   * @returns Session data or null
   */
  private static async decodePayload(
    encodedValue: string,
    secret: string
  ): Promise<Types.SessionData | null> {
    try {
      const value = encodedValue.includes('%') ? decodeURIComponent(encodedValue) : encodedValue
      const dot = value.lastIndexOf('.')
      if (dot <= 0 || dot === value.length - 1) {
        return null
      }
      const payloadB64 = value.slice(0, dot)
      const sigB64 = value.slice(dot + 1)
      const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
      )
      const sigBytes = Session.base64UrlDecode(sigB64)
      const valid = await crypto.subtle.verify(
        'HMAC',
        key,
        sigBytes.buffer as ArrayBuffer,
        new TextEncoder().encode(payloadB64)
      )
      if (!valid) {
        return null
      }
      const payloadBytes = Session.base64UrlDecode(payloadB64)
      const payloadStr = new TextDecoder().decode(payloadBytes)
      return JSON.parse(payloadStr) as Types.SessionData
    } catch {
      return null
    }
  }

  /**
   * Encode and sign session with HMAC.
   * @description Returns payload dot signature in base64url.
   * @param sessionData - Session object to encode
   * @param secret - Secret for HMAC signing
   * @returns Signed cookie value string
   */
  private static async encodePayload(
    sessionData: Types.SessionData,
    secret: string
  ): Promise<string> {
    const payloadStr = JSON.stringify(sessionData)
    const payloadBytes = new TextEncoder().encode(payloadStr)
    const payloadB64 = Session.base64UrlEncode(payloadBytes)
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64))
    const sigB64 = Session.base64UrlEncode(new Uint8Array(sig))
    return `${payloadB64}.${sigB64}`
  }
}
