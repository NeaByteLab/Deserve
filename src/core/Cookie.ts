import type * as Types from '@interfaces/index.ts'

/**
 * Cookie header serialization helper.
 * @description Builds Set-Cookie header strings from options.
 */
export class Cookie {
  /**
   * Serialize cookie into header string.
   * @description Encodes name, value, and attribute options.
   * @param name - Cookie name to set
   * @param value - Cookie value to set
   * @param options - Optional cookie attribute values
   * @returns Serialized Set-Cookie header string
   * @throws When name, expires, maxAge, or sameSite invalid
   */
  static serialize(name: string, value: string, options?: Types.CookieInit): string {
    if (name.length === 0) {
      throw new TypeError('Cookie name must be a non-empty string')
    }
    const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`]
    if (options !== undefined) {
      if (options.path !== undefined) {
        parts.push(`Path=${options.path}`)
      }
      if (options.domain !== undefined) {
        parts.push(`Domain=${options.domain}`)
      }
      if (options.expires !== undefined) {
        const expires = options.expires instanceof Date
          ? options.expires
          : new Date(options.expires)
        if (Number.isNaN(expires.getTime())) {
          throw new TypeError('Cookie expires must be a valid Date or timestamp')
        }
        parts.push(`Expires=${expires.toUTCString()}`)
      }
      if (options.maxAge !== undefined) {
        if (!Number.isFinite(options.maxAge)) {
          throw new TypeError('Cookie maxAge must be a finite number of seconds')
        }
        parts.push(`Max-Age=${Math.trunc(options.maxAge)}`)
      }
      if (options.sameSite !== undefined) {
        if (options.sameSite === 'None' && options.secure !== true) {
          throw new TypeError('Cookie sameSite None requires secure true')
        }
        parts.push(`SameSite=${options.sameSite}`)
      }
      if (options.secure === true) {
        parts.push('Secure')
      }
      if (options.httpOnly === true) {
        parts.push('HttpOnly')
      }
    }
    return parts.join('; ')
  }
}
