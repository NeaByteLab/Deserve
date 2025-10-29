import type { Middleware } from '@app/Types.ts'
import type { Context } from '@app/Context.ts'

/**
 * User credentials for basic authentication.
 */
export interface BasicAuthUser {
  /** Username */
  username: string
  /** Password */
  password: string
}

/**
 * Basic authentication configuration options.
 */
export interface BasicAuthOptions {
  /** Array of valid user credentials */
  users: BasicAuthUser[]
}

/**
 * Creates a basic authentication middleware.
 * @param options - Basic auth configuration options
 * @returns Middleware function
 */
export function basicAuth(options: BasicAuthOptions): Middleware {
  const { users } = options
  if (!users || users.length === 0) {
    throw new Error('Basic auth: users array cannot be empty')
  }
  return async (ctx: Context, next: () => Promise<Response>): Promise<Response> => {
    ctx.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"')
    const authHeader = ctx.header('authorization') as string | undefined
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return ctx.handleError(401, new Error('Unauthorized'))
    }
    try {
      const base64Credentials = authHeader.slice(6)
      const [username, password] = atob(base64Credentials).split(':')
      if (!username || !password) {
        return ctx.handleError(401, new Error('Unauthorized'))
      }
      const isValid = users.some((v) => v.username === username && v.password === password)
      if (!isValid) {
        return ctx.handleError(401, new Error('Unauthorized'))
      }
      return await next()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return ctx.handleError(401, new Error(`Basic auth error: ${errorMessage}`))
    }
  }
}
