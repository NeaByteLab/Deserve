import type { DeserveRequest } from '@app/Request.ts'

/**
 * Error middleware function type.
 * @param req - HTTP request object
 * @param error - Error information
 * @returns HTTP response or null (null uses default error response)
 */
export type ErrorMiddleware = (
  req: Request,
  error: {
    path: string
    method: string
    statusCode: number
    error?: Error
  }
) => Response | null

/**
 * Route handler function type.
 * @param req - Enhanced request object with query parsing
 * @param params - Route parameters from URL
 * @returns HTTP response or promise
 */
export type RouterHandler = (
  req: DeserveRequest,
  params: Record<string, string>
) => Response | Promise<Response>

/**
 * Middleware function type.
 * @param req - HTTP request object (Request or DeserveRequest)
 * @param res - HTTP response object (optional for response modification)
 * @returns HTTP response or null
 */
export type RouterMiddleware = (req: Request | DeserveRequest, res?: Response) => Response | null

/**
 * Router configuration options.
 */
export interface RouterOptions {
  /** Directory prefix for route files */
  prefix: string
  /** File extension for route files */
  extension: string
}
