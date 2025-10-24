import type { ErrorMiddleware, RouterHandler, RouterMiddleware, RouterOptions } from '@app/Types.ts'
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
  constructor(options: RouterOptions) {
    if (!options) {
      this.routesDir = `${Deno.cwd()}/routes`
      this.routesExt = '.ts'
    } else {
      if (!options.prefix || !options.extension) {
        throw new Error('Router requires both prefix and extension options')
      } else {
        const allowedExtensions = ['.cjs', '.js', '.jsx', '.mjs', '.ts', '.tsx']
        if (!allowedExtensions.includes(options.extension)) {
          throw new Error(`Invalid extension: ${options.extension}`)
        }
        this.routesDir = `${Deno.cwd()}/${options.prefix}`
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
   * @param port - Port number to serve on
   */
  async serve(port = 8000): Promise<void> {
    await this.initializeRoutes()
    Deno.serve({ port }, this.createHandler())
  }

  /**
   * Add global middleware to the pipeline.
   * @param middleware - Middleware function to execute before route handlers.
   */
  use(middleware: RouterMiddleware): void {
    this.middlewarePipeline.push(middleware)
  }

  /**
   * Create native Deno.serve handler with URLPattern-based routing.
   * @returns Request handler function
   */
  private createHandler(): (req: Request) => Promise<Response> {
    return handleRequest(
      this.middlewarePipeline,
      this.routeCache,
      this.routePattern,
      this.routesExt,
      this.errorMiddleware
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
        if (entry.isDirectory) {
          const newBasePath = basePath ? `${basePath}/${entry.name}` : entry.name
          await this.scanRoutes(fullPath, newBasePath)
        } else if (entry.name.endsWith(this.routesExt)) {
          const routePath = basePath ? `${basePath}/${entry.name}` : entry.name
          const module = await import(`file://${fullPath}`)
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
}
