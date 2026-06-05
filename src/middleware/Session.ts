import type * as Types from '@interfaces/index.ts'
import type * as Core from '@core/index.ts'

/**
 * Cookie-based session middleware.
 * @description Manages set/clear in ctx.state with HMAC signing.
 */
export class Session {
  /** Default session cookie options */
  private static readonly defaultOptions: Types.SessionCookieOpts = {
    cookieName: 'session',
    maxAge: 86400,
    path: '/',
    sameSite: 'Lax',
    httpOnly: true,
    secure: true
  }
  /** UTF-8 text decoder instance */
  private static readonly decoder = new TextDecoder()
  /** UTF-8 text encoder instance */
  private static readonly encoder = new TextEncoder()

  /**
   * Create session middleware.
   * @description Populates ctx.state with session and helpers, requires cookieSecret.
   * @param options - Session options with required cookieSecret
   * @returns Middleware that populates ctx.state.session
   * @throws {Deno.errors.InvalidData} When cookieSecret is missing or empty
   */
  static create(options: Types.SessionOptions): Types.Middleware {
    if (!options.cookieSecret || options.cookieSecret.length < 32) {
      throw new Deno.errors.InvalidData(
        'Session cookieSecret must be at least 32 characters for HMAC-SHA256 security'
      )
    }
    const maxAge = options.maxAge ?? Session.defaultOptions.maxAge
    if (maxAge <= 0 || !Number.isFinite(maxAge)) {
      throw new Deno.errors.InvalidData(
        'Session maxAge must be a positive finite number of seconds'
      )
    }
    const path = options.path ?? Session.defaultOptions.path
    if (!path) {
      throw new Deno.errors.InvalidData('Session path must be a non-empty string')
    }
    const sameSite = options.sameSite ?? Session.defaultOptions.sameSite
    const secure = options.secure ?? Session.defaultOptions.secure
    if (sameSite === 'None' && !secure) {
      throw new Deno.errors.InvalidData(
        'Session SameSite=None requires secure=true, browsers reject insecure SameSite=None cookies'
      )
    }
    const sessionOptions: Types.SessionCookieOpts = {
      cookieName: options.cookieName ?? Session.defaultOptions.cookieName,
      maxAge,
      path,
      sameSite,
      httpOnly: options.httpOnly ?? Session.defaultOptions.httpOnly,
      secure
    }
    let hmacKey: CryptoKey | null = null
    const getHmacKey = async (): Promise<CryptoKey> => {
      if (hmacKey) {
        return hmacKey
      }
      hmacKey = await crypto.subtle.importKey(
        'raw',
        Session.encoder.encode(options.cookieSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
      )
      return hmacKey
    }
    return async (
      ctx: Core.Context,
      next: Types.NextFn
    ): Types.AsyncMiddlewareResult => {
      const key = await getHmacKey()
      const cookieValue = ctx.cookie(sessionOptions.cookieName)
      ctx.state['session'] = cookieValue
        ? await Session.decodePayload(cookieValue, key, maxAge)
        : null
      ctx.state['setSession'] = async (data: Types.DataRecord) => {
        const encodedPayload = await Session.encodePayload(data, key)
        ctx.setHeader(
          'Set-Cookie',
          Session.setCookieHeader(sessionOptions.cookieName, encodedPayload, sessionOptions)
        )
      }
      ctx.state['clearSession'] = () => {
        ctx.setHeader(
          'Set-Cookie',
          Session.clearCookieHeader(sessionOptions.cookieName, sessionOptions.path)
        )
      }
      return await next()
    }
  }

  /**
   * Decode base64url to bytes.
   * @description Converts base64url string to Uint8Array with padding.
   * @param encodedStr - Base64url encoded string
   * @returns Decoded byte array
   */
  private static base64UrlDecode(encodedStr: string): Uint8Array {
    const base64 = encodedStr.replace(/-/g, '+').replace(/_/g, '/')
    const padLength = base64.length % 4
    const padded = padLength ? base64 + '='.repeat(4 - padLength) : base64
    const binary = atob(padded)
    return Uint8Array.from(binary, (ch) => ch.charCodeAt(0))
  }

  /**
   * Encode bytes to base64url.
   * @description Converts Uint8Array to base64url string without padding.
   * @param bytes - Raw byte array to encode
   * @returns Base64url encoded string
   */
  private static base64UrlEncode(bytes: Uint8Array): string {
    const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('')
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  /**
   * Build Set-Cookie header to clear session.
   * @description Header string Max-Age=0 for name and path.
   * @param cookieName - Cookie name to clear
   * @param path - Cookie path
   * @returns Set-Cookie header string
   */
  private static clearCookieHeader(cookieName: string, path: string): string {
    return `${encodeURIComponent(cookieName)}=; Path=${path}; Max-Age=0`
  }

  /**
   * Decode and verify signed session payload.
   * @description Returns null on parse error, invalid signature, or expiry.
   * @param encodedValue - Cookie value payload dot signature base64url
   * @param key - CryptoKey for HMAC verification
   * @param maxAge - Maximum age in seconds for server-side expiry
   * @returns Session data or null
   */
  private static async decodePayload(
    encodedValue: string,
    key: CryptoKey,
    maxAge: number
  ): Promise<Types.DataRecord | null> {
    try {
      const value = encodedValue.includes('%') ? decodeURIComponent(encodedValue) : encodedValue
      const dotIndex = value.lastIndexOf('.')
      if (dotIndex <= 0 || dotIndex === value.length - 1) {
        return null
      }
      const payloadB64 = value.slice(0, dotIndex)
      const sigB64 = value.slice(dotIndex + 1)
      const sigBytes = Session.base64UrlDecode(sigB64)
      const valid = await crypto.subtle.verify(
        'HMAC',
        key,
        sigBytes.buffer as ArrayBuffer,
        Session.encoder.encode(payloadB64)
      )
      if (!valid) {
        return null
      }
      const payloadBytes = Session.base64UrlDecode(payloadB64)
      const payloadStr = Session.decoder.decode(payloadBytes)
      const parsed = JSON.parse(payloadStr) as Types.DataRecord
      const issuedAt = parsed['_iat']
      if (typeof issuedAt !== 'number' || Math.floor(Date.now() / 1000) - issuedAt > maxAge) {
        return null
      }
      const { _iat: _, ...sessionData } = parsed
      return sessionData
    } catch {
      return null
    }
  }

  /**
   * Encode and sign session with HMAC.
   * @description Embeds _iat timestamp, returns payload dot signature.
   * @param sessionData - Session object to encode
   * @param key - CryptoKey for HMAC signing
   * @returns Signed cookie value string
   */
  private static async encodePayload(
    sessionData: Types.DataRecord,
    key: CryptoKey
  ): Promise<string> {
    const stamped = { ...sessionData, _iat: Math.floor(Date.now() / 1000) }
    const payloadStr = JSON.stringify(stamped)
    const payloadBytes = Session.encoder.encode(payloadStr)
    const payloadB64 = Session.base64UrlEncode(payloadBytes)
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      Session.encoder.encode(payloadB64)
    )
    const sigB64 = Session.base64UrlEncode(new Uint8Array(signatureBuffer))
    return `${payloadB64}.${sigB64}`
  }

  /**
   * Build Set-Cookie header with value.
   * @description Joins name value Path Max-Age SameSite HttpOnly.
   * @param name - Cookie name
   * @param value - Encoded payload
   * @param opts - Cookie opts path maxAge sameSite httpOnly
   * @returns Set-Cookie header string
   */
  private static setCookieHeader(
    name: string,
    value: string,
    opts: Types.SessionCookieOpts
  ): string {
    const cookieParts = [
      `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
      `Path=${opts.path}`,
      `Max-Age=${opts.maxAge}`,
      `SameSite=${opts.sameSite}`
    ]
    if (opts.httpOnly) {
      cookieParts.push('HttpOnly')
    }
    if (opts.secure) {
      cookieParts.push('Secure')
    }
    return cookieParts.join('; ')
  }
}
