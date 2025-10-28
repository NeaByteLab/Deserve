import { serveDir, type ServeDirOptions } from '@std/http/file-server'
import type {
  ErrorMiddleware,
  Middleware,
  MiddlewareEntry,
  RouteHandler,
  RouteMetadata,
  StaticFileHandler
} from '@app/Types.ts'
import { FastRouter } from '@neabyte/fast-router'
import { pathToFileURL } from 'node:url'
import { allowedExtensions, httpMethods } from '@app/Constant.ts'
import { Context } from '@app/Context.ts'

/**
 * Request handler class.
 * @description Manages routes, static file serving, and error handling.
 */
export class Handler {
  private routerInstance = new FastRouter<RouteMetadata>()
  private errorMiddleware: ErrorMiddleware | null = null
  private middlewares: MiddlewareEntry[] = []

  /**
   * Adds a static file route.
   * @param urlPath - URL path to serve static files from
   * @param options - Static file serving options
   */
  addStaticRoute(urlPath: string, options: ServeDirOptions): void {
    const staticHandler: StaticFileHandler = {
      staticRoute: true,
      execute: async (req: Request) => {
        const serveOptions: ServeDirOptions = {
          fsRoot: options.fsRoot ?? './static',
          urlRoot: urlPath.startsWith('/') ? urlPath.slice(1) : urlPath,
          ...options
        }
        return await serveDir(req, serveOptions)
      }
    }
    for (const method of httpMethods) {
      const routePattern = urlPath === '/' ? '/**' : `${urlPath}/**`
      const metadata: RouteMetadata = {
        handler: staticHandler as RouteHandler | StaticFileHandler,
        pattern: routePattern
      }
      this.routerInstance.add(method, routePattern, metadata)
    }
  }

  /**
   * Creates the main request handler function.
   * @returns Async function that handles requests and returns responses
   */
  createHandler(): (req: Request) => Promise<Response> {
    return async (req: Request) => {
      try {
        const url = new URL(req.url)
        const context = new Context(req, url, {})
        const middlewareResult = await this.executeMiddlewares(context, url.pathname)
        if (middlewareResult !== undefined) {
          return middlewareResult
        }
        const routeResult = this.routerInstance.find(req.method, url.pathname)
        if (routeResult) {
          const metadata = 'data' in routeResult ? routeResult.data : null
          if (!metadata) {
            return this.handleError(req, 404, new Error('Route not found'))
          }
          if ('params' in routeResult && routeResult.params) {
            context.setParams(routeResult.params)
          }
          const { handler } = metadata as RouteMetadata
          if (
            handler &&
            typeof handler === 'object' &&
            'staticRoute' in handler &&
            handler.staticRoute
          ) {
            return await (handler as StaticFileHandler).execute(req)
          }
          try {
            return await (handler as RouteHandler)(context)
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
   * Converts a file path to a route pattern.
   * @param routePath - File path to convert
   * @returns Route pattern string or null if invalid
   */
  createRoutePattern(routePath: string): string | null {
    const pathExtension = routePath.split('.').pop()
    if (!allowedExtensions.includes(pathExtension ?? '')) {
      return null
    }
    const pathWithoutExt = routePath.slice(0, -`.${pathExtension}`.length)
    const pathLastSegment = pathWithoutExt.split('/').pop()
    if (!/^[a-zA-Z0-9_\[\].~\-+]+$/.test(pathLastSegment ?? '')) {
      return null
    }
    const pathPattern = `/${pathWithoutExt}`.replace(/\[([^\]]+)\]/g, ':$1')
    if (pathPattern.endsWith('/index')) {
      return pathPattern.slice(0, -5)
    }
    return pathPattern
  }

  /**
   * Handles errors with optional custom error middleware.
   * @param req - The request object
   * @param statusCode - HTTP status code
   * @param error - Error object
   * @returns Error response
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
   * Scans directory for route files and registers them.
   * @param targetDir - Directory to scan
   * @param basePath - Base path for route pattern generation
   * @throws {Error} When directory is not found
   */
  async scanRoutes(targetDir: string, basePath = ''): Promise<void> {
    try {
      for await (const entry of Deno.readDir(targetDir)) {
        const fullPath = `${targetDir}/${entry.name}`
        const routePath = basePath ? `${basePath}/${entry.name}` : entry.name
        if (entry.isDirectory) {
          await this.scanRoutes(fullPath, routePath)
        } else {
          const fileModule = await import(pathToFileURL(fullPath).href)
          const routePattern = this.createRoutePattern(routePath)
          if (routePattern) {
            this.validateRouteModule(fileModule, routePath)
            Object.keys(fileModule).forEach(method => {
              const handler = fileModule[method] as RouteHandler
              const metadata: RouteMetadata = {
                handler,
                pattern: routePattern
              }
              this.routerInstance.add(method.toUpperCase(), routePattern, metadata)
            })
          }
        }
      }
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        throw new Error(`Routes directory not found: ${targetDir}`)
      } else {
        throw error
      }
    }
  }

  /**
   * Adds middleware to the stack.
   * @param path - Path pattern (empty for global)
   * @param handlers - Middleware functions
   */
  addMiddleware(path: string, ...handlers: Middleware[]): void {
    for (const handler of handlers) {
      this.middlewares.push({ path, handler })
    }
  }

  /**
   * Sets the error handling middleware.
   * @param errorMiddleware - Error handling function
   */
  setErrorMiddleware(errorMiddleware: ErrorMiddleware): void {
    this.errorMiddleware = errorMiddleware
  }

  /**
   * Executes middleware chain for a given path.
   * @param ctx - Request context
   * @param pathname - Request pathname
   * @returns Response if middleware returned one, undefined otherwise
   */
  private async executeMiddlewares(ctx: Context, pathname: string): Promise<Response | undefined> {
    const applicableMiddlewares = this.middlewares.filter(
      mw => mw.path === '' || pathname.startsWith(mw.path) || mw.path === '*'
    )
    let index = 0
    const next = async (): Promise<Response> => {
      if (index >= applicableMiddlewares.length) {
        return undefined as unknown as Response
      }
      const middleware = applicableMiddlewares[index]
      if (!middleware) {
        return undefined as unknown as Response
      }
      index++
      const result = await middleware.handler(ctx, next)
      if (result !== undefined) {
        return result
      }
      return next()
    }
    return await next()
  }

  /**
   * Validates that a route module exports valid HTTP methods.
   * @param module - Module to validate
   * @param routePath - Route path for error messages
   * @throws {Error} When module is invalid
   */
  validateRouteModule(module: Record<string, unknown>, routePath: string): void {
    const exportedMethods = Object.keys(module).filter(key => httpMethods.includes(key))
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
