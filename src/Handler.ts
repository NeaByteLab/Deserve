import type { ErrorMiddleware, RouterHandler, RouterMiddleware } from '@app/Types.ts'

/**
 * Executes the appropriate handler method for the request.
 * @param module - Route handler module
 * @param method - HTTP method
 * @param req - HTTP request object
 * @param params - Route parameters
 * @param errorMiddleware - Optional error middleware for custom error responses
 * @returns HTTP response
 */
async function executeHandler(
  module: Record<string, RouterHandler>,
  method: string,
  req: Request,
  params: Record<string, string>,
  errorMiddleware?: ErrorMiddleware | null
): Promise<Response> {
  if (module[method]) {
    try {
      return await module[method](req, params)
    } catch (error) {
      if (errorMiddleware) {
        const customResponse = errorMiddleware(req, {
          path: req.url,
          method,
          statusCode: 500,
          error: error as Error
        })
        if (customResponse) {
          return customResponse
        }
      }
      return new Response(null, { status: 500 })
    }
  }
  if (errorMiddleware) {
    const customResponse = errorMiddleware(req, {
      path: req.url,
      method,
      statusCode: 501,
      error: new Error('Method Not Allowed')
    })
    if (customResponse) {
      return customResponse
    }
  }
  return new Response(null, { status: 501 })
}

/**
 * Finds matching route pattern and extracts parameters.
 * @param normalizedPath - Normalized pathname
 * @param url - URL object for origin
 * @param routePattern - Map of URLPattern instances to route paths
 * @param routesExt - File extension for route files
 * @returns Object containing matched module path and extracted parameters
 */
function findMatchingRoute(
  normalizedPath: string,
  url: URL,
  routePattern: Map<URLPattern, string>,
  routesExt: string
): { routePath: string | null; params: Record<string, string> } {
  const sortedPatterns = Array.from(routePattern.entries()).sort((a, b) => {
    const aPath = a[1].replace(routesExt, '')
    const bPath = b[1].replace(routesExt, '')
    return bPath.length - aPath.length
  })
  for (const [pattern, routePath] of sortedPatterns) {
    const normalizedUrl = new URL(normalizedPath, url.origin)
    const match = pattern.exec(normalizedUrl)
    if (match) {
      const groups = (match.pathname.groups || {}) as Record<string, string | undefined>
      const isValidMatch = Object.values(groups).every(
        (value) => typeof value === 'string' && !value.includes('/')
      )
      if (isValidMatch) {
        const params = Object.fromEntries(
          Object.entries(groups).filter(([_, value]) => typeof value === 'string')
        ) as Record<string, string>
        return { routePath, params }
      }
    }
  }
  return { routePath: null, params: {} }
}

/**
 * Request handler factory function.
 * @param middleware - Array of middleware functions
 * @param routeCache - Map of route paths to handler modules
 * @param routePattern - Map of URLPattern instances to route paths
 * @param routesExt - File extension for route files
 * @param errorMiddleware - Optional error middleware for custom error responses
 * @returns Request handler function
 */
export function handleRequest(
  middleware: Array<RouterMiddleware>,
  routeCache: Map<string, Record<string, RouterHandler>>,
  routePattern: Map<URLPattern, string>,
  routesExt: string,
  errorMiddleware?: ErrorMiddleware | null
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const middlewareResponse = processMiddleware(middleware, req)
    if (middlewareResponse) {
      return middlewareResponse
    }
    const url = new URL(req.url)
    const method = req.method
    const normalizedPath = normalizePath(url.pathname)
    const exactPath = getExactPath(normalizedPath, routesExt)
    let module = routeCache.get(exactPath)
    let params: Record<string, string> = {}
    if (!module) {
      const { routePath, params: extractedParams } = findMatchingRoute(
        normalizedPath,
        url,
        routePattern,
        routesExt
      )
      if (routePath) {
        module = routeCache.get(routePath)
        params = extractedParams
      }
    }
    if (!module) {
      if (errorMiddleware) {
        const customResponse = errorMiddleware(req, {
          path: req.url,
          method,
          statusCode: 404,
          error: new Error('Route Not Found')
        })
        if (customResponse) {
          return customResponse
        }
      }
      return new Response(null, { status: 404 })
    }
    return await executeHandler(module, method, req, params, errorMiddleware)
  }
}

/**
 * Converts normalized path to exact file path for route lookup.
 * @param normalizedPath - Normalized pathname
 * @param routesExt - File extension for route files
 * @returns Exact file path for route lookup
 */
function getExactPath(normalizedPath: string, routesExt: string): string {
  return normalizedPath === '/' ? `index${routesExt}` : `${normalizedPath.slice(1)}${routesExt}`
}

/**
 * Normalizes URL pathname by removing duplicate slashes and trailing slashes.
 * @param pathname - Raw pathname from URL
 * @returns Normalized pathname
 */
function normalizePath(pathname: string): string {
  return pathname.replace(/\/+/g, '/').replace(/\/$/, '') || '/'
}

/**
 * Processes middleware functions and returns early response if any middleware handles the request.
 * @param middleware - Array of middleware functions
 * @param req - HTTP request object
 * @returns Response if middleware handled request, null otherwise
 */
function processMiddleware(middleware: Array<RouterMiddleware>, req: Request): Response | null {
  for (const middlewareFn of middleware) {
    const result = middlewareFn(req)
    if (result) {
      return result
    }
  }
  return null
}
