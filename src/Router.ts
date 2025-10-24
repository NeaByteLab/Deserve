import type { ServeDirOptions } from '@std/http/file-server'
import type { ErrorMiddleware, RouterHandler, RouterMiddleware, RouterOptions } from '@app/Types.ts'
import { pathToFileURL } from 'node:url'
import { handleRequest } from '@app/Handler.ts'
import { middlewares } from '@middlewares/index.ts'

/**
 * Native Deno.serve file-based router.
 * @description File-based routing with URLPattern matching and middleware support.
 */
export class Router {
  /** Error middleware for custom error responses */
  private errorMiddleware: ErrorMiddleware | null = null
  /** Middleware pipeline for request processing */
  private middlewarePipeline: Array<RouterMiddleware> = []
  /** Static file routes configuration */
  private staticRoutes = new Map<string, ServeDirOptions>()
  /** Route-specific middleware configuration */
  private routeSpecific = new Map<string, Array<RouterMiddleware>>()
  /** Cache of loaded route modules */
  private routeCache = new Map<string, Record<string, RouterHandler>>()
  /** URLPattern to route path mapping */
  private routePattern = new Map<URLPattern, string>()
  /** Directory containing route files */
  private routesDir: string
  /** File extension for route files */
  private routesExt: string

  /**
   * Initialize router with configuration options.
   * @param options - Router configuration options
   * @throws {Error} When prefix or extension options are missing or invalid
   */
  constructor(options?: RouterOptions) {
    if (!options) {
      this.routesDir = './routes'
      this.routesExt = '.ts'
    } else {
      if (!options.prefix || !options.extension) {
        throw new Error('Router requires both prefix and extension options')
      } else {
        const allowedExtensions = ['.cjs', '.js', '.jsx', '.mjs', '.ts', '.tsx']
        if (!allowedExtensions.includes(options.extension)) {
          throw new Error(`Invalid extension: ${options.extension}`)
        }
        this.routesDir = options.prefix.startsWith('/')
          ? options.prefix
          : `${Deno.cwd()}/${options.prefix}`
        this.routesExt = options.extension
      }
    }
  }

  /**
   * Apply built-in middleware by name.
   * @param mwareConfig - Array of middleware names or [name, options] tuples
   */
  apply(mwareConfig: Array<string | [string, unknown]>): void {
    for (const config of mwareConfig) {
      if (typeof config === 'string') {
        const middleware = middlewares[config as keyof typeof middlewares]
        if (middleware) {
          this.middlewarePipeline.push(middleware())
        }
      } else if (Array.isArray(config)) {
        const [name, options] = config
        const middleware = middlewares[name as keyof typeof middlewares]
        if (middleware) {
          this.middlewarePipeline.push(
            middleware(options as unknown as Parameters<typeof middleware>[0])
          )
        }
      }
    }
  }

  /**
   * Set error middleware for custom 404 and 501 responses.
   * @param middleware - Error middleware function
   */
  onError(middleware: ErrorMiddleware): void {
    this.errorMiddleware = middleware
  }

  /**
   * Start server with file-based routing.
   * @param port - Port number to serve on (default: 8000)
   * @param hostname - Hostname to bind to (default: "0.0.0.0")
   * @param signal - Abort signal for server control
   */
  async serve(port?: number): Promise<void>
  async serve(port?: number, hostname?: string): Promise<void>
  async serve(port?: number, hostname?: string, signal?: AbortSignal): Promise<void>
  async serve(port?: number, hostname?: string, signal?: AbortSignal): Promise<void> {
    await this.initializeRoutes()
    const actualPort = port ?? 8000
    const actualHostname = hostname ?? '0.0.0.0'
    if (signal) {
      Deno.serve({
        port: actualPort,
        hostname: actualHostname,
        signal,
        handler: this.createHandler()
      })
    } else {
      Deno.serve({
        port: actualPort,
        hostname: actualHostname,
        handler: this.createHandler()
      })
    }
  }

  /**
   * Serve static files from a directory.
   * @param urlPath - URL path to serve files from
   * @param options - Static file serving options
   */
  static(urlPath: string, options?: ServeDirOptions): void {
    this.staticRoutes.set(urlPath, options || {})
  }

  /**
   * Add global middleware to the pipeline.
   * @param middleware - Middleware function to execute before route handlers.
   */
  use(middleware: RouterMiddleware): void
  /**
   * Add route-specific middleware to the pipeline.
   * @param routePath - Route path pattern to apply middleware to
   * @param middleware - Middleware function to execute for matching routes
   */
  use(routePath: string, middleware: RouterMiddleware): void
  use(routePathOrMiddleware: string | RouterMiddleware, middleware?: RouterMiddleware): void {
    if (typeof routePathOrMiddleware === 'string' && middleware) {
      const existing = this.routeSpecific.get(routePathOrMiddleware) || []
      existing.push(middleware)
      this.routeSpecific.set(routePathOrMiddleware, existing)
    } else if (typeof routePathOrMiddleware === 'function') {
      this.middlewarePipeline.push(routePathOrMiddleware)
    }
  }

  /**
   * Create native Deno.serve handler with URLPattern-based routing.
   * @returns Request handler function
   */
  private createHandler(): (req: Request) => Promise<Response> {
    return handleRequest(
      this.errorMiddleware,
      this.middlewarePipeline,
      this.routeCache,
      this.routePattern,
      this.routeSpecific,
      this.routesExt,
      this.staticRoutes
    )
  }

  /**
   * Create URLPattern from route file path.
   * @param routePath - File path of the route
   * @returns URLPattern instance or null if invalid
   */
  private createURLPattern(routePath: string): URLPattern | null {
    const pathWithoutExt = routePath.replace(this.routesExt, '')
    if (pathWithoutExt === 'index') {
      return new URLPattern({ pathname: '/' })
    }
    let patternPath = `/${pathWithoutExt}`
    patternPath = patternPath.replace(/\[([^\]]+)\]/g, ':$1')
    try {
      return new URLPattern({ pathname: patternPath })
    } catch {
      return null
    }
  }

  /**
   * Initialize and cache all route files at startup.
   */
  private async initializeRoutes(): Promise<void> {
    await this.scanRoutes(this.routesDir)
  }

  /**
   * Recursively scan directory for route files.
   * @param dir - Directory to scan
   * @param basePath - Base path for route resolution
   * @throws {Error} When routes directory is not found
   */
  private async scanRoutes(dir: string, basePath = ''): Promise<void> {
    try {
      for await (const entry of Deno.readDir(dir)) {
        const fullPath = `${dir}/${entry.name}`
        const routePath = basePath ? `${basePath}/${entry.name}` : entry.name
        if (entry.isDirectory) {
          await this.scanRoutes(fullPath, routePath)
        } else if (entry.name.endsWith(this.routesExt)) {
          const fileURL = pathToFileURL(fullPath).href
          const module = await import(fileURL)
          this.validateRouteModule(module, routePath)
          this.routeCache.set(routePath, module)
          const urlPattern = this.createURLPattern(routePath)
          if (urlPattern) {
            this.routePattern.set(urlPattern, routePath)
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
   * Validates route module exports to ensure they are valid handler functions.
   * @param module - Route module to validate
   * @param routePath - Path of the route file for error reporting
   * @throws {Error} When route exports are invalid
   */
  private validateRouteModule(module: Record<string, unknown>, routePath: string): void {
    const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
    for (const [key, value] of Object.entries(module)) {
      if (validMethods.includes(key)) {
        if (typeof value !== 'function') {
          throw new Error(`Route ${routePath}: ${key} must be a function, got ${typeof value}`)
        }
        const paramCount = value.length
        if (paramCount < 1 || paramCount > 2) {
          throw new Error(
            `Route ${routePath}: ${key} function must accept 1 or 2 parameters (Request, params)`
          )
        }
      }
    }
  }
}
