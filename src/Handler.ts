import {
  Context,
  type ErrorMiddleware,
  type Middleware,
  type MiddlewareEntry,
  type RouteHandler,
  type RouteMetadata,
  type ServeOptions,
  type StaticFileHandler
} from '@app/index.ts'
import { pathToFileURL } from 'node:url'
import { FastRouter } from '@neabyte/fast-router'
import { allowedExtensions, contentTypes, httpMethods } from '@app/Constant.ts'

/**
 * Request handler class.
 * @description Manages routes, static file serving, and error handling.
 */
export class Handler {
  private routerInstance = new FastRouter<RouteMetadata>()
  private entryMiddleware: MiddlewareEntry[] = []
  private errorMiddleware: ErrorMiddleware | null = null

  /**
   * Adds middleware to the stack.
   * @param path - Path pattern (empty for global)
   * @param handlers - Middleware functions
   */
  addMiddleware(path: string, ...handlers: Middleware[]): void {
    for (const handler of handlers) {
      this.entryMiddleware.push({ path, handler })
    }
  }

  /**
   * Adds a static file route.
   * @param urlPath - URL path to serve static files from
   * @param options - Static file serving options
   */
  addStaticRoute(urlPath: string, options: ServeOptions): void {
    for (const method of httpMethods) {
      const routePattern = urlPath === '/' ? '/**' : `${urlPath}/**`
      const metadata: RouteMetadata = {
        handler: {
          staticRoute: true,
          execute: async (ctx: Context) => {
            return await this.serveStaticFile(ctx, options)
          }
        },
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
      const url = new URL(req.url)
      const ctx = new Context(req, url, {}, this.handleResponse)
      try {
        const middlewareResult = await this.executeMiddlewares(ctx, url.pathname)
        if (middlewareResult !== undefined) {
          return middlewareResult
        }
        const routeResult = this.routerInstance.find(req.method, url.pathname)
        if (routeResult) {
          const metadata = 'data' in routeResult ? routeResult.data : null
          if (!metadata) {
            return ctx.handleError(404, new Error('Route not found'))
          }
          if ('params' in routeResult && routeResult.params) {
            ctx.setParams(routeResult.params)
          }
          const { handler } = metadata as RouteMetadata
          if (
            handler &&
            typeof handler === 'object' &&
            'staticRoute' in handler &&
            handler.staticRoute
          ) {
            return await (handler as StaticFileHandler).execute(ctx)
          }
          try {
            return await (handler as RouteHandler)(ctx)
          } catch (error) {
            return ctx.handleError(500, error as Error)
          }
        }
        return ctx.handleError(404, new Error('Route not found'))
      } catch (error) {
        return ctx.handleError(500, error as Error)
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
   * Handles responses with optional custom error middleware.
   * @param ctx - The context object
   * @param statusCode - HTTP status code
   * @param error - Error object
   * @returns Response
   */
  handleResponse(ctx: Context, statusCode: number, error: Error): Response {
    if (this.errorMiddleware) {
      const customResponse = this.errorMiddleware(ctx, {
        path: ctx.url,
        method: ctx.request.method,
        statusCode,
        error
      })
      if (customResponse) {
        return customResponse
      }
    }
    return ctx.send.custom(null, { status: statusCode, headers: ctx.responseHeadersMap })
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
            Object.keys(fileModule).forEach((method) => {
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
   * Sets the error handling middleware.
   * @param errorMiddleware - Error handling function
   */
  setErrorMiddleware(errorMiddleware: ErrorMiddleware): void {
    this.errorMiddleware = errorMiddleware
  }

  /**
   * Validates that a route module exports valid HTTP methods.
   * @param module - Module to validate
   * @param routePath - Route path for error messages
   * @throws {Error} When module is invalid
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

  /**
   * Executes middleware chain for a given path.
   * @param ctx - Request context
   * @param pathname - Request pathname
   * @returns Response if middleware returned one, undefined otherwise
   */
  private async executeMiddlewares(ctx: Context, pathname: string): Promise<Response | undefined> {
    const applicableMiddlewares = this.entryMiddleware.filter(
      (mw) => mw.path === '' || pathname.startsWith(mw.path) || mw.path === '*'
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
   * Serves static files from the filesystem.
   * @param ctx - Context object
   * @param options - Static file serving options
   * @returns Response with file or 404
   */
  private async serveStaticFile(ctx: Context, options: ServeOptions): Promise<Response> {
    try {
      const params = ctx.params()
      const filePath = params['_'] ?? 'index.html'
      const basePath = options.path.startsWith('/') ? options.path : `${Deno.cwd()}/${options.path}`
      const fullPath = new URL(filePath, `file://${basePath.replace(/^\.\//, '')}/`).pathname
      const fileInfo = await Deno.stat(fullPath).catch(() => null)
      if (!fileInfo || !fileInfo.isFile) {
        return ctx.handleError(404, new Error('File not found'))
      }
      const fileData = await Deno.readFile(fullPath)
      const extension = filePath.split('.').pop()?.toLowerCase() ?? ''
      const contentType = contentTypes[extension] ?? 'application/octet-stream'
      let etag: string | null = null
      if (options.etag) {
        const hashBuffer = await crypto.subtle.digest('SHA-256', fileData)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
        etag = `"${hashHex}"`
      }
      if (etag && ctx.request.headers.get('If-None-Match') === etag) {
        ctx.setHeader('ETag', etag)
        if (options.cacheControl !== undefined) {
          ctx.setHeader('Cache-Control', `public, max-age=${options.cacheControl}`)
        }
        return ctx.handleError(304, new Error('Not Modified'))
      }
      ctx.setHeader('Content-Type', contentType)
      ctx.setHeader('Content-Length', fileData.length.toString())
      if (etag) {
        ctx.setHeader('ETag', etag)
      }
      if (options.cacheControl !== undefined) {
        ctx.setHeader('Cache-Control', `public, max-age=${options.cacheControl}`)
      }
      return ctx.send.custom(fileData)
    } catch (error) {
      return ctx.handleError(500, error as Error)
    }
  }
}
