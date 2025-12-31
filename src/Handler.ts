import type {
  ErrorMiddleware,
  Middleware,
  MiddlewareEntry,
  RouteHandler,
  RouteMetadata,
  ServeOptions,
  StaticFileHandler
} from '@app/Types.ts'
import { pathToFileURL } from 'node:url'
import { FastRouter } from '@neabyte/fast-router'
import { allowedExtensions, contentTypes, httpMethods } from '@app/Constant.ts'
import { Context } from '@app/Context.ts'

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
          urlPath,
          execute: async (ctx: Context) => {
            return await this.serveStaticFile(ctx, options, urlPath)
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
            const staticHandler = handler as StaticFileHandler
            return await staticHandler.execute(ctx)
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
   * Handles responses for routes and errors.
   * @param ctx - Context object
   * @param statusCode - HTTP status code
   * @param error - Error object
   * @returns Response object
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
    const isJson = ctx.request.headers.get('accept')?.includes('application/json')
    if (isJson) {
      return ctx.send.json(
        {
          error: error.message,
          path: ctx.pathname,
          statusCode
        },
        { status: statusCode }
      )
    }
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${statusCode} - ${error.message}</title>
          <style>
            body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fafafa; color: #333; }
            .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
            h1 { font-size: 3rem; margin: 0; color: #ff6b6b; }
            p { color: #666; margin: 1rem 0; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>${statusCode}</h1>
            <p>${error.message}</p>
          </div>
        </body>
      </html>
    `
    return ctx.send.html(html, { status: statusCode })
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
          const pathExtension = entry.name.split('.').pop()?.toLowerCase()
          if (!allowedExtensions.includes(pathExtension ?? '')) {
            continue
          }
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
        return
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

  /**
   * Executes middleware chain for a given path.
   * @param ctx - Request context
   * @param pathname - Request pathname
   * @returns Response if middleware returned one, undefined otherwise
   */
  private async executeMiddlewares(ctx: Context, pathname: string): Promise<Response | undefined> {
    const applicableMiddlewares = this.entryMiddleware.filter(mw => {
      if (mw.path === '' || mw.path === '*') return true
      if (mw.path.endsWith('/**')) {
        const base = mw.path.slice(0, -3)
        return pathname.startsWith(base)
      }
      return pathname === mw.path
    })
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
   * @param urlPath - URL mount point
   * @returns Response with file or 404
   */
  private async serveStaticFile(
    ctx: Context,
    options: ServeOptions,
    urlPath: string
  ): Promise<Response> {
    try {
      let filePath = ctx.pathname
      if (urlPath !== '/') {
        filePath = ctx.pathname.slice(urlPath.length)
      }
      if (filePath === '/' || filePath === '') {
        filePath = 'index.html'
      } else if (filePath.startsWith('/')) {
        filePath = filePath.slice(1)
      }
      const basePath = options.path.startsWith('/') ? options.path : `${Deno.cwd()}/${options.path}`
      const fullPath = new URL(filePath, `file://${basePath.replace(/^\.\//, '')}/`).pathname
      const fileInfo = await Deno.stat(fullPath).catch(() => null)
      if (!fileInfo || !fileInfo.isFile) {
        return ctx.handleError(404, new Error('File not found'))
      }
      const extension = filePath.split('.').pop()?.toLowerCase() ?? ''
      const contentType = contentTypes[extension] ?? 'application/octet-stream'
      const file = await Deno.open(fullPath, { read: true })
      let etag: string | null = null
      if (options.etag) {
        const hashBuffer = await crypto.subtle.digest(
          'SHA-256',
          new TextEncoder().encode(`${fileInfo.size}-${fileInfo.mtime?.getTime()}`)
        )
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
        etag = `"${hashHex}"`
      }
      if (etag && ctx.request.headers.get('If-None-Match') === etag) {
        file.close()
        ctx.setHeader('ETag', etag)
        if (options.cacheControl !== undefined) {
          ctx.setHeader('Cache-Control', `public, max-age=${options.cacheControl}`)
        }
        return ctx.handleError(304, new Error('Not Modified'))
      }
      ctx.setHeader('Content-Type', contentType)
      ctx.setHeader('Content-Length', fileInfo.size.toString())
      if (etag) {
        ctx.setHeader('ETag', etag)
      }
      if (options.cacheControl !== undefined) {
        ctx.setHeader('Cache-Control', `public, max-age=${options.cacheControl}`)
      }
      return ctx.send.custom(file.readable)
    } catch (error) {
      return ctx.handleError(500, error as Error)
    }
  }
}
