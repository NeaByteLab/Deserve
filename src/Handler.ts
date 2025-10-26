import { serveDir, type ServeDirOptions } from '@std/http/file-server'
import type { ErrorMiddleware, RouterMiddleware } from '@app/Types.ts'
import { FastRouter } from '@neabyte/fast-router'
import { pathToFileURL } from 'node:url'
import { httpMethods } from '@app/Constant.ts'
import { DeserveRequest } from '@app/Request.ts'

/**
 * Handler class for managing and error handling.
 * @description Contains core functionality for request handling and route management.
 */
export class Handler {
  /** Error middleware handler */
  private errorMiddleware: ErrorMiddleware | null = null
  /** Middleware pipeline for request processing */
  private middlewarePipeline: Array<RouterMiddleware> = []
  /** Static file routes configuration */
  private staticRoutes = new Map<string, ServeDirOptions>()
  /** Route-specific middleware configuration */
  private routeSpecific = new Map<string, Array<RouterMiddleware>>()
  /** FastRouter instance */
  private router = new FastRouter()
  /** File extension for route files */
  private routesExt: string

  /**
   * Initialize Handler with file extension for route files.
   * @param routesExt - File extension for route files
   */
  constructor(routesExt: string) {
    this.routesExt = routesExt
  }

  /**
   * Add middleware to the pipeline for all routes.
   * @param middleware - Middleware function to add
   */
  addMiddleware(middleware: RouterMiddleware): void {
    this.middlewarePipeline.push(middleware)
  }

  /**
   * Add middleware for a specific route path for specific routes.
   * @param routePath - Route path pattern
   * @param middleware - Middleware function to add
   */
  addRouteSpecific(routePath: string, middleware: RouterMiddleware): void {
    const existing = this.routeSpecific.get(routePath) || []
    existing.push(middleware)
    this.routeSpecific.set(routePath, existing)
  }

  /**
   * Add a static route for specific routes.
   * @param urlPath - URL path to serve files from
   * @param options - Static file serving options
   */
  addStaticRoute(urlPath: string, options: ServeDirOptions): void {
    this.staticRoutes.set(urlPath, options)
  }

  /**
   * Create native Deno.serve handler with static file serving.
   * @returns Request handler function
   */
  createHandler(): (req: Request) => Promise<Response> {
    return async (req: Request) => {
      try {
        const url = new URL(req.url)
        const routeResult = this.router.find(req.method, url.pathname)
        const params = routeResult && 'params' in routeResult ? routeResult.params || {} : {}
        const deserveReq = new DeserveRequest(req, params)
        const middlewareRequest: Request | DeserveRequest = deserveReq
        for (const [urlPath, options] of this.staticRoutes) {
          if (url.pathname.startsWith(urlPath)) {
            const serveOptions = {
              urlRoot: urlPath.startsWith('/') ? urlPath.slice(1) : urlPath,
              ...options
            }
            return serveDir(req, serveOptions)
          }
        }
        for (const [routePath, middlewares] of this.routeSpecific) {
          if (url.pathname.startsWith(routePath)) {
            for (const middleware of middlewares) {
              const result = middleware(middlewareRequest)
              if (result) {
                return result
              }
            }
          }
        }
        for (const middleware of this.middlewarePipeline) {
          const result = middleware(middlewareRequest)
          if (result) {
            return result
          }
        }
        if (routeResult) {
          try {
            const handler = 'data' in routeResult ? routeResult.data : routeResult
            return await (
              handler as (req: DeserveRequest, params: Record<string, string>) => Promise<Response>
            )(deserveReq, params)
          } catch (error) {
            return this.handleError(req, 500, error as Error)
          }
        }
        return this.handleError(req, 404, new Error('Route not found'))
      } catch (error) {
        return this.handleError(req, 500, error as Error)
      }
    }
  }

  /**
   * Create route pattern from route file path.
   * @param routePath - File path of the route
   * @returns Route pattern string or null if invalid
   */
  createRoutePattern(routePath: string): string | null {
    const pathWithoutExt = routePath.replace(this.routesExt, '')
    const pathLastSegment = pathWithoutExt.split('/').pop()
    const isValidSegment = /^[a-zA-Z0-9_\[\].~\-+]+$/
    if (!isValidSegment.test(pathLastSegment ?? '')) {
      return null
    }
    const pathPattern = `/${pathWithoutExt}`.replace(/\[([^\]]+)\]/g, ':$1')
    if (pathPattern.endsWith('/index')) {
      return pathPattern.slice(0, -5)
    }
    return pathPattern
  }

  /**
   * Handle error response.
   * @param req - Request object
   * @param statusCode - Status code
   * @param error - Error object
   * @returns Response object
   */
  handleError(req: Request, statusCode: number, error: Error): Response {
    if (this.errorMiddleware) {
      const customResponse = this.errorMiddleware(req, {
        path: req.url,
        method: req.method,
        statusCode,
        error
      })
      if (customResponse) {
        return customResponse
      }
    }
    return new Response(null, { status: statusCode })
  }

  /**
   * Recursively scan directory for route files.
   * @param dir - Directory to scan
   * @param basePath - Base path for route resolution
   * @throws {Error} When routes directory is not found
   */
  async scanRoutes(dir: string, basePath = ''): Promise<void> {
    try {
      for await (const entry of Deno.readDir(dir)) {
        const fullPath = `${dir}/${entry.name}`
        const routePath = basePath ? `${basePath}/${entry.name}` : entry.name
        if (entry.isDirectory) {
          await this.scanRoutes(fullPath, routePath)
        } else if (entry.name.endsWith(this.routesExt)) {
          const fileModule = await import(pathToFileURL(fullPath).href)
          const routePattern = this.createRoutePattern(routePath)
          if (routePattern) {
            this.validateRouteModule(fileModule, routePath)
            Object.keys(fileModule).forEach((method) => {
              this.router.add(method.toUpperCase(), routePattern, fileModule[method])
            })
          }
        }
      }
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        throw new Error(`Routes directory not found: ${dir}`)
      } else {
        throw error
      }
    }
  }

  /**
   * Set error middleware handler for custom error responses.
   * @param errorMiddleware - Error middleware function
   */
  setErrorMiddleware(errorMiddleware: ErrorMiddleware): void {
    this.errorMiddleware = errorMiddleware
  }

  /**
   * Validates route module exports to ensure they are valid handler functions.
   * @param module - Route module to validate
   * @param routePath - Path of the route file for error reporting
   * @throws {Error} When route exports are invalid
   */
  validateRouteModule(module: Record<string, unknown>, routePath: string): void {
    const exportedMethods = Object.keys(module).filter((key) => httpMethods.includes(key))
    if (exportedMethods.length === 0) {
      throw new Error(
        `Route ${routePath}: Must export at least one HTTP method (${httpMethods.join(', ')})`
      )
    }
    for (const [key, value] of Object.entries(module)) {
      if (httpMethods.includes(key)) {
        if (typeof value !== 'function') {
          throw new Error(`Route ${routePath}: ${key} must be a function, got ${typeof value}`)
        }
      }
    }
  }
}
