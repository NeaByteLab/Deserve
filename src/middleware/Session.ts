import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'
import * as Middleware from '@middleware/index.ts'

/**
 * Signed cookie session middleware.
 * @description Manages HMAC-signed session cookies per request.
 */
export class Session {
  /** Base64url encoding options without padding */
  private static readonly base64UrlOptions = { alphabet: 'base64url', omitPadding: true } as const

  /**
   * Create session middleware.
   * @description Builds middleware loading and signing session cookies.
   * @param options - Session configuration with secret
   * @returns Middleware function managing session state
   * @throws {Deno.errors.InvalidData} When options fail validation
   */
  static create(options: Types.SessionOptions): Types.MiddlewareFn {
    if (options.secret.length < 32) {
      throw new Deno.errors.InvalidData(
        'Session secret must be at least 32 characters for HMAC-SHA256 strength'
      )
    }
    const maxAge = options.maxAge ?? Core.Constant.defaultSessionOptions.maxAge
    if (!Number.isInteger(maxAge) || maxAge <= 0) {
      throw new Deno.errors.InvalidData('Session maxAge must be a positive whole number of seconds')
    }
    const sameSite = options.sameSite ?? Core.Constant.defaultSessionOptions.sameSite
    const secure = options.secure ?? Core.Constant.defaultSessionOptions.secure
    if (sameSite === 'None' && !secure) {
      throw new Deno.errors.InvalidData(
        'Session SameSite None requires secure true, browsers reject insecure SameSite None cookies'
      )
    }
    const name = options.name ?? Core.Constant.defaultSessionOptions.name
    const path = options.path ?? Core.Constant.defaultSessionOptions.path
    const httpOnly = options.httpOnly ?? Core.Constant.defaultSessionOptions.httpOnly
    const cookieInit: Types.CookieInit = { httpOnly, maxAge, path, sameSite, secure }
    let signingKey: Promise<CryptoKey> | null = null
    const loadKey = (): Promise<CryptoKey> => {
      signingKey ??= Core.API.subtle.importKey(
        'raw',
        Core.Constant.encoder.encode(options.secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
      )
      return signingKey
    }
    return Middleware.Wrap.apply('session', async (ctx, next) => {
      const key = await loadKey()
      const cookieValue = ctx.get.cookie(name)
      let sessionState: Types.SessionData | null = null
      if (cookieValue !== undefined) {
        const decoded = await Session.decodePayload(cookieValue, key, maxAge)
        if ('data' in decoded) {
          sessionState = decoded.data
        } else {
          Core.Context.internalOf(ctx).emitEvent(
            Core.Observability.internalEvent('session:invalid', {
              cookieName: name,
              reason: decoded.reason
            })
          )
        }
      }
      Core.Context.internalOf(ctx).installSession({
        state: sessionState,
        write: async (data) => {
          if (data === null) {
            ctx.set.cookie(name, '', { ...cookieInit, maxAge: 0 })
            return
          }
          const encoded = await Session.encodePayload(data, key)
          ctx.set.cookie(name, encoded, cookieInit)
        }
      })
      return await next()
    })
  }

  /**
   * Decode and verify session payload.
   * @description Verifies signature and checks expiry window.
   * @param value - Raw signed cookie value
   * @param key - HMAC key for verification
   * @param maxAge - Maximum session age in seconds
   * @returns Decode result with data or reason
   */
  private static async decodePayload(
    value: string,
    key: CryptoKey,
    maxAge: number
  ): Promise<Types.SessionDecodeResult> {
    try {
      const dotIndex = value.lastIndexOf('.')
      if (dotIndex <= 0 || dotIndex === value.length - 1) {
        return { reason: 'malformed' }
      }
      const payloadPart = value.slice(0, dotIndex)
      const signaturePart = value.slice(dotIndex + 1)
      const signatureBytes = Uint8Array.fromBase64(signaturePart, Session.base64UrlOptions)
      const isAuthentic = await Core.API.subtle.verify(
        'HMAC',
        key,
        signatureBytes,
        Core.Constant.encoder.encode(payloadPart)
      )
      if (!isAuthentic) {
        return { reason: 'tampered' }
      }
      const payloadBytes = Uint8Array.fromBase64(payloadPart, Session.base64UrlOptions)
      const parsed = Core.API.jsonParse(
        Core.Constant.decoder.decode(payloadBytes)
      ) as Types.SessionData
      const issuedAt = parsed['_iat']
      if (typeof issuedAt !== 'number' || Math.floor(Date.now() / 1000) - issuedAt > maxAge) {
        return { reason: 'expired' }
      }
      delete parsed['_iat']
      return { data: parsed }
    } catch {
      return { reason: 'malformed' }
    }
  }

  /**
   * Encode and sign session payload.
   * @description Stamps issue time and appends HMAC signature.
   * @param data - Session data to encode
   * @param key - HMAC key for signing
   * @returns Signed base64url cookie value
   */
  private static async encodePayload(data: Types.SessionData, key: CryptoKey): Promise<string> {
    const stamped = { ...data, _iat: Math.floor(Date.now() / 1000) }
    const payloadPart = Core.Constant.encoder.encode(Core.API.jsonStringify(stamped))
      .toBase64(Session.base64UrlOptions)
    const signature = await Core.API.subtle.sign(
      'HMAC',
      key,
      Core.Constant.encoder.encode(payloadPart)
    )
    const signaturePart = new Uint8Array(signature).toBase64(Session.base64UrlOptions)
    return `${payloadPart}.${signaturePart}`
  }
}
