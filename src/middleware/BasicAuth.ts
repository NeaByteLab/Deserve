import type * as Types from '@interfaces/index.ts'
import type * as Core from '@core/index.ts'

/**
 * Basic Auth middleware for users.
 * @description Validates Authorization header, constant-time compare.
 */
export class BasicAuth {
  /**
   * Create Basic Auth middleware.
   * @description Validates Authorization header against the user list.
   * @param options - List of username/password pairs
   * @returns Middleware that returns 401 when invalid
   * @throws {Deno.errors.InvalidData} When users array is empty
   */
  static create(options: Types.BasicAuthOptions): Types.MiddlewareFn {
    if (!options.users || options.users.length === 0) {
      throw new Deno.errors.InvalidData('BasicAuth requires at least one user in the users array')
    }
    const users = options.users
    return async (
      ctx: Core.Context,
      next: Types.NextFn
    ): Types.AsyncMiddlewareResult => {
      const authHeader = ctx.header('authorization')
      const spaceIndex = authHeader ? authHeader.indexOf(' ') : -1
      const scheme = spaceIndex > 0 ? authHeader!.slice(0, spaceIndex) : ''
      if (scheme.toLowerCase() !== 'basic') {
        ctx.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"')
        return await ctx.handleError(
          401,
          new Deno.errors.PermissionDenied('Missing or invalid Authorization header')
        )
      }
      try {
        const credentials = atob(authHeader!.slice(spaceIndex + 1).trim())
        const colonIndex = credentials.indexOf(':')
        if (colonIndex <= 0) {
          ctx.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"')
          return await ctx.handleError(
            401,
            new Deno.errors.PermissionDenied('Malformed Basic Auth credentials')
          )
        }
        let isValid = false
        for (const user of users) {
          if (BasicAuth.constantTimeEqual(credentials, `${user.username}:${user.password}`)) {
            isValid = true
          }
        }
        if (!isValid) {
          ctx.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"')
          return await ctx.handleError(
            401,
            new Deno.errors.PermissionDenied('Invalid username or password')
          )
        }
        return await next()
      } catch (error) {
        ctx.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"')
        return await ctx.handleError(
          401,
          new Deno.errors.PermissionDenied(
            `BasicAuth failed because ${error instanceof Error ? error.message : 'unknown error'}`
          )
        )
      }
    }
  }

  /**
   * Constant-time string comparison for credentials.
   * @description Compares two strings in constant time.
   * @param inputStr - First string
   * @param expectedStr - Second string
   * @returns True when equal
   */
  private static constantTimeEqual(inputStr: string, expectedStr: string): boolean {
    const maxLength = Math.max(inputStr.length, expectedStr.length)
    let mismatch = inputStr.length ^ expectedStr.length
    for (let i = 0; i < maxLength; i++) {
      mismatch |= (inputStr.charCodeAt(i) || 0) ^ (expectedStr.charCodeAt(i) || 0)
    }
    return mismatch === 0
  }
}
