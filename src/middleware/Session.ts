import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'
import * as Middleware from '@middleware/index.ts'

/**
 * Cookie-based session middleware.
 * @description Manages set/clear in ctx.state with HMAC signing.
 */
export class Session {
  /**
   * Create session middleware.
   * @description Populates ctx.state with session and helpers, requires cookieSecret.
   * @param options - Session options with required cookieSecret
   * @returns Middleware that populates ctx.state.session
   * @throws {Deno.errors.InvalidData} When cookieSecret is missing or empty
   */
  static create(options: Types.SessionOptions): Types.MiddlewareFn {
    if (!options.cookieSecret || options.cookieSecret.length < 32) {
      throw new Deno.errors.InvalidData(
        'Session cookieSecret must be at least 32 characters for HMAC-SHA256 security'
      )
    }
    const maxAge = Core.Handler.assertPositiveFinite(
      options.maxAge ?? Core.Constant.defaultSessionOptions.maxAge,
      'Session maxAge',
      'seconds'
    )
    const path = options.path ?? Core.Constant.defaultSessionOptions.path
    if (!path) {
      throw new Deno.errors.InvalidData('Session path must be a non-empty string')
    }
    const sameSite = options.sameSite ?? Core.Constant.defaultSessionOptions.sameSite
    const secure = options.secure ?? Core.Constant.defaultSessionOptions.secure
    if (sameSite === 'None' && !secure) {
      throw new Deno.errors.InvalidData(
        'Session SameSite=None requires secure=true, browsers reject insecure SameSite=None cookies'
      )
    }
    const sessionOptions: Types.SessionCookieOpts = {
      cookieName: options.cookieName ?? Core.Constant.defaultSessionOptions.cookieName,
      maxAge,
      path,
      sameSite,
      httpOnly: options.httpOnly ?? Core.Constant.defaultSessionOptions.httpOnly,
      secure
    }
    let hmacKeyPromise: Promise<CryptoKey> | null = null
    const getHmacKey = (): Promise<CryptoKey> => {
      hmacKeyPromise ??= Core.API.subtle.importKey(
        'raw',
        Core.Constant.encoder.encode(options.cookieSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
      )
      return hmacKeyPromise
    }
    return Middleware.WrapMware('Session error', async (ctx, next) => {
      const key = await getHmacKey()
      const cookieValue = ctx.cookie(sessionOptions.cookieName)
      ctx[Core.InternalContext].setInternalState(
        Core.Handler.stateKeys.session,
        cookieValue ? await Session.decodePayload(cookieValue, key, maxAge) : null
      )
      ctx[Core.InternalContext].setInternalState(
        Core.Handler.stateKeys.setSession,
        async (sessionData: Types.DataRecord) => {
          const encodedPayload = await Session.encodePayload(sessionData, key)
          ctx.setHeader(
            'Set-Cookie',
            Session.setCookieHeader(sessionOptions.cookieName, encodedPayload, sessionOptions)
          )
        }
      )
      ctx[Core.InternalContext].setInternalState(Core.Handler.stateKeys.clearSession, () => {
        ctx.setHeader(
          'Set-Cookie',
          Session.clearCookieHeader(sessionOptions.cookieName, sessionOptions.path)
        )
      })
      return await next()
    })
  }

  /**
   * Decode base64url to bytes.
   * @description Converts base64url string to Uint8Array with padding.
   * @param encodedStr - Base64url encoded string
   * @returns Decoded byte array
   */
  private static base64UrlDecode(encodedStr: string): Uint8Array {
    const base64 = encodedStr.replace(/[-_]/g, (sourceChar) => sourceChar === '-' ? '+' : '/')
    const padLength = base64.length % 4
    const padded = padLength ? base64 + '='.repeat(4 - padLength) : base64
    const binary = atob(padded)
    const bytes = new Uint8Array(binary.length)
    for (let charIndex = 0; charIndex < binary.length; charIndex++) {
      bytes[charIndex] = binary.charCodeAt(charIndex)
    }
    return bytes
  }

  /**
   * Encode bytes to base64url.
   * @description Converts Uint8Array to base64url string without padding.
   * @param bytes - Raw byte array to encode
   * @returns Base64url encoded string
   */
  private static base64UrlEncode(bytes: Uint8Array): string {
    let binary = ''
    for (let charIndex = 0; charIndex < bytes.length; charIndex++) {
      binary += String.fromCharCode(bytes[charIndex]!)
    }
    return btoa(binary).replace(
      /[+/=]/g,
      (sourceChar) => sourceChar === '+' ? '-' : sourceChar === '/' ? '_' : ''
    )
  }

  /**
   * Build cookie header to clear session.
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
      const decodedValue = encodedValue.includes('%')
        ? decodeURIComponent(encodedValue)
        : encodedValue
      const dotIndex = decodedValue.lastIndexOf('.')
      if (dotIndex <= 0 || dotIndex === decodedValue.length - 1) {
        return null
      }
      const payloadB64 = decodedValue.slice(0, dotIndex)
      const signatureB64 = decodedValue.slice(dotIndex + 1)
      const signatureBytes = Session.base64UrlDecode(signatureB64)
      const isValid = await Core.API.subtle.verify(
        'HMAC',
        key,
        new Uint8Array(signatureBytes).buffer as ArrayBuffer,
        Core.Constant.encoder.encode(payloadB64)
      )
      if (!isValid) {
        return null
      }
      const payloadBytes = Session.base64UrlDecode(payloadB64)
      const payloadStr = Core.Constant.decoder.decode(payloadBytes)
      const parsedPayload = Core.API.jsonParse(payloadStr) as Types.DataRecord
      const issuedAt = parsedPayload['_iat']
      if (typeof issuedAt !== 'number' || Math.floor(Date.now() / 1000) - issuedAt > maxAge) {
        return null
      }
      const { _iat, ...sessionData } = parsedPayload
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
    const stampedPayload = { ...sessionData, _iat: Math.floor(Date.now() / 1000) }
    const payloadStr = Core.API.jsonStringify(stampedPayload)
    const payloadBytes = Core.Constant.encoder.encode(payloadStr)
    const payloadB64 = Session.base64UrlEncode(payloadBytes)
    const signatureBuffer = await Core.API.subtle.sign(
      'HMAC',
      key,
      Core.Constant.encoder.encode(payloadB64)
    )
    const signatureB64 = Session.base64UrlEncode(new Uint8Array(signatureBuffer))
    return `${payloadB64}.${signatureB64}`
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
