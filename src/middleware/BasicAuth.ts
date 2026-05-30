import type * as Types from '@interfaces/index.ts'
import type * as Core from '@core/index.ts'

/**
 * Basic Auth middleware with user list.
 * @description Validates Authorization header; constant-time compare.
 */
export class BasicAuth {
  /**
   * Create Basic Auth middleware.
   * @description Validates Authorization header against user list.
   * @param options - List of username/password pairs
   * @returns Middleware that returns 401 when invalid
   * @throws {Deno.errors.InvalidData} When users array is empty
   */
  static create(options: Types.BasicAuthOptions): Types.Middleware {
    if (!options.users || options.users.length === 0) {
      throw new Deno.errors.InvalidData('BasicAuth requires at least one user in the users array')
    }
    const users = options.users
    return async (
      ctx: Core.Context,
      next: Types.NextFn
    ): Types.AsyncMiddlewareResult => {
      ctx.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"')
      const authHeader = ctx.header('authorization')
      if (!authHeader || !authHeader.startsWith('Basic ')) {
        return await ctx.handleError(
          401,
          new Deno.errors.PermissionDenied('Missing or invalid Authorization header')
        )
      }
      try {
        const credentials = atob(authHeader.slice(6))
        const colonIndex = credentials.indexOf(':')
        if (colonIndex <= 0 || colonIndex === credentials.length - 1) {
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
          return await ctx.handleError(
            401,
            new Deno.errors.PermissionDenied('Invalid username or password')
          )
        }
        return await next()
      } catch (error) {
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
   * @param a - First string
   * @param b - Second string
   * @returns True when equal
   */
  private static constantTimeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false
    }
    let result = 0
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }
    return result === 0
  }
}
