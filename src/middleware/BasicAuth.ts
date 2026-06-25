import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'
import * as Middleware from '@middleware/index.ts'

/**
 * HTTP Basic Authentication middleware.
 * @description Validates Authorization header against user list.
 */
export class BasicAuth {
  /**
   * Create Basic Auth middleware.
   * @description Builds middleware checking credentials against users.
   * @param options - Basic auth configuration with users
   * @returns Middleware function enforcing authentication
   * @throws {Deno.errors.InvalidData} When users array is empty
   */
  static create(options: Types.BasicAuthOptions): Types.MiddlewareFn {
    if (options.users.length === 0) {
      throw new Deno.errors.InvalidData('BasicAuth requires at least one user in the users array')
    }
    const users = options.users
    const challenge = `Basic realm="${options.realm ?? 'Secure Area'}"`
    return Middleware.Wrap.apply('basicAuth', async (ctx, next) => {
      const authHeader = ctx.get.header('authorization')
      const spaceIndex = authHeader === undefined ? -1 : authHeader.indexOf(' ')
      const scheme = spaceIndex > 0 ? authHeader!.slice(0, spaceIndex) : ''
      if (scheme.toLowerCase() !== 'basic') {
        Core.Context.internalOf(ctx).emitEvent(
          Core.Observability.internalEvent('auth:failed', { reason: 'missing' })
        )
        ctx.set.header('WWW-Authenticate', challenge)
        return await ctx.handleError(
          401,
          new Deno.errors.PermissionDenied('Missing or invalid Authorization header')
        )
      }
      const credentials = BasicAuth.decodeCredentials(authHeader!.slice(spaceIndex + 1).trim())
      if (credentials === null || credentials.indexOf(':') <= 0) {
        Core.Context.internalOf(ctx).emitEvent(
          Core.Observability.internalEvent('auth:failed', { reason: 'malformed' })
        )
        ctx.set.header('WWW-Authenticate', challenge)
        return await ctx.handleError(
          401,
          new Deno.errors.PermissionDenied('Malformed Basic Auth credentials')
        )
      }
      let isAuthorized = false
      for (const user of users) {
        if (BasicAuth.constantTimeEqual(credentials, `${user.username}:${user.password}`)) {
          isAuthorized = true
        }
      }
      if (!isAuthorized) {
        Core.Context.internalOf(ctx).emitEvent(
          Core.Observability.internalEvent('auth:failed', { reason: 'invalid' })
        )
        ctx.set.header('WWW-Authenticate', challenge)
        return await ctx.handleError(
          401,
          new Deno.errors.PermissionDenied('Invalid username or password')
        )
      }
      return await next()
    })
  }

  /**
   * Compare two strings in constant time.
   * @description Prevents timing attacks during credential check.
   * @param inputValue - Provided credential string
   * @param expectedValue - Expected credential string
   * @returns True when both strings match exactly
   */
  private static constantTimeEqual(inputValue: string, expectedValue: string): boolean {
    const maxLength = Math.max(inputValue.length, expectedValue.length)
    let mismatch = inputValue.length ^ expectedValue.length
    for (let charIndex = 0; charIndex < maxLength; charIndex++) {
      mismatch |= (inputValue.charCodeAt(charIndex) || 0) ^
        (expectedValue.charCodeAt(charIndex) || 0)
    }
    return mismatch === 0
  }

  /**
   * Decode base64 credential string.
   * @description Returns null when base64 decoding fails.
   * @param encoded - Base64 encoded credential pair
   * @returns Decoded string or null on failure
   */
  private static decodeCredentials(encoded: string): string | null {
    try {
      return atob(encoded)
    } catch {
      return null
    }
  }
}
