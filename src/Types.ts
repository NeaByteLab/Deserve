/**
 * Router configuration options.
 */
export interface RouterOptions {
  /** Directory prefix for route files */
  prefix: string
  /** File extension for route files */
  extension: string
}

/**
 * Route handler function type.
 * @param req - HTTP request object
 * @param params - Route parameters from URL
 * @returns HTTP response or promise
 */
export type RouterHandler = (
  req: Request,
  params: Record<string, string>
) => Response | Promise<Response>

/**
 * Middleware function type.
 * @param req - HTTP request object
 * @returns HTTP response or null
 */
export type RouterMiddleware = (req: Request) => Response | null
