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
   * @throws {Error} When users array is empty
   */
  static create(options: Types.BasicAuthOptions): Types.Middleware {
    const { users } = options
    if (!users || users.length === 0) {
      throw new Error('Basic auth: users array cannot be empty')
    }
    return async (
      ctx: Core.Context,
      next: () => Promise<Response | undefined>
    ): Promise<Response | undefined> => {
      ctx.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"')
      const authHeader = ctx.header('authorization') as string | undefined
      if (!authHeader || !authHeader.startsWith('Basic ')) {
        return await ctx.handleError(401, new Error('Unauthorized'))
      }
      try {
        const credentials = atob(authHeader.slice(6))
        const colonIndex = credentials.indexOf(':')
        if (colonIndex <= 0 || colonIndex === credentials.length - 1) {
          return await ctx.handleError(401, new Error('Unauthorized'))
        }
        let isValid = false
        for (const userCredential of users) {
          const expected = `${userCredential.username}:${userCredential.password}`
          if (BasicAuth.constantTimeEqual(credentials, expected)) {
            isValid = true
          }
        }
        if (!isValid) {
          return await ctx.handleError(401, new Error('Unauthorized'))
        }
        return await next()
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return await ctx.handleError(401, new Error(`Basic auth error: ${errorMessage}`))
      }
    }
  }

  /**
   * Constant-time string comparison for credentials.
   * @description Compares two strings in constant time to avoid timing leaks.
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
