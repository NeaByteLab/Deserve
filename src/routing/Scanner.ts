import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'
import type { FastRouter } from '@neabyte/fast-router'

/**
 * Filesystem route scanner.
 * @description Discovers, validates, and registers route modules.
 */
export class Scanner {
  /**
   * Build route pattern from path.
   * @description Returns null when path is not loadable.
   * @param routePath - Relative route file path
   * @param extensions - Allowed file extensions
   * @returns Route pattern string or null
   */
  static createPattern(routePath: string, extensions: readonly string[]): string | null {
    const pathExtension = routePath.split('.').pop()?.toLowerCase() ?? ''
    if (!extensions.includes(pathExtension)) {
      return null
    }
    const pathWithoutExtension = routePath.slice(0, -`.${pathExtension}`.length)
    const segments = pathWithoutExtension.split('/')
    if (segments.some((segment) => segment.startsWith('_') || segment.startsWith('@'))) {
      return null
    }
    const fileName = routePath.split('/').pop() ?? ''
    if (fileName.split('.').length !== 2) {
      return null
    }
    const lastSegment = segments.at(-1)
    if (!/^[a-zA-Z0-9_\[\]~\-+]+$/.test(lastSegment ?? '')) {
      return null
    }
    let pathPattern = `/${pathWithoutExtension}`.replace(/\[([^\]]+)\]/g, ':$1')
    if (pathPattern.toLowerCase().endsWith('/index')) {
      pathPattern = pathPattern.slice(0, -6) || '/'
    }
    return pathPattern
  }

  /**
   * Recursively scan directory for routes.
   * @description Imports, validates, and registers found route modules.
   * @param routerInstance - Router receiving registered handlers
   * @param targetDir - Directory to scan
   * @param basePath - Accumulated relative base path
   * @param methods - Supported HTTP methods
   * @param extensions - Allowed file extensions
   * @param emit - Optional event emitter
   * @returns Promise resolving when scan completes
   * @throws {Error} When scanning fails for non-missing directory
   */
  static async explore(
    routerInstance: FastRouter<Types.RouteEntry>,
    targetDir: string,
    basePath: string,
    methods: readonly string[],
    extensions: readonly string[],
    emit: Types.EventFn | null = null
  ): Promise<void> {
    try {
      for await (const dirEntry of Deno.readDir(targetDir)) {
        const fullPath = `${targetDir}/${dirEntry.name}`
        const routePath = basePath ? `${basePath}/${dirEntry.name}` : dirEntry.name
        if (dirEntry.isDirectory) {
          await Scanner.explore(routerInstance, fullPath, routePath, methods, extensions, emit)
          continue
        }
        const pathExtension = dirEntry.name.split('.').pop()?.toLowerCase()
        if (!extensions.includes(pathExtension ?? '')) {
          continue
        }
        const routePattern = Scanner.createPattern(routePath, extensions)
        if (routePattern === null) {
          if (emit !== null) {
            emit(
              Core.Observability.internalEvent('route:ignored', {
                path: routePath,
                reason: 'route path does not match a loadable pattern'
              })
            )
          }
          continue
        }
        const fileModule = await Core.API.importRouteModule(fullPath)
        Scanner.validateModule(fileModule, routePath, methods)
        Scanner.registerHandlers(routerInstance, fileModule, routePattern, methods)
        if (emit !== null) {
          emit(
            Core.Observability.internalEvent('route:added', {
              path: routePath,
              pattern: routePattern
            })
          )
        }
      }
    } catch (scanError) {
      if (scanError instanceof Deno.errors.NotFound) {
        return
      }
      throw scanError
    }
  }

  /**
   * Register module handlers on router.
   * @description Adds function exports for each supported method.
   * @param routerInstance - Router receiving registered handlers
   * @param fileModule - Imported route module
   * @param routePattern - Route pattern to register
   * @param methods - Supported HTTP methods
   */
  static registerHandlers(
    routerInstance: FastRouter<Types.RouteEntry>,
    fileModule: Types.RouteModule,
    routePattern: string,
    methods: readonly string[]
  ): void {
    for (const method of methods) {
      const routeHandler = fileModule[method] as Types.RouteHandler | undefined
      if (typeof routeHandler !== 'function') {
        continue
      }
      routerInstance.add(method, routePattern, { handler: routeHandler, pattern: routePattern })
    }
  }

  /**
   * Validate route module exports.
   * @description Ensures method exports are functions and present.
   * @param module - Imported route module
   * @param routePath - Relative route file path
   * @param methods - Supported HTTP methods
   * @throws {TypeError} When a method export is not function
   * @throws {Deno.errors.InvalidData} When no method is exported
   */
  static validateModule(
    module: Types.RouteModule,
    routePath: string,
    methods: readonly string[]
  ): void {
    let hasMethod = false
    for (const method of methods) {
      const exportValue = module[method]
      if (exportValue === undefined) {
        continue
      }
      if (typeof exportValue !== 'function') {
        throw new TypeError(
          `Route "${routePath}" export "${method}" must be a function, got ${typeof exportValue}`
        )
      }
      hasMethod = true
    }
    if (!hasMethod) {
      throw new Deno.errors.InvalidData(
        `Route "${routePath}" must export at least one HTTP method (${methods.join(', ')})`
      )
    }
  }
}
