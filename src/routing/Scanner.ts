import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'
import type { FastRouter } from '@neabyte/fast-router'

/**
 * File-based route discovery and pattern creation.
 * @description Walks directory, converts paths to route patterns.
 */
export class Scanner {
  /**
   * Convert file path to router pattern.
   * @description Drops extension, [id] to :id, /index to /.
   * @param routePath - Relative path like users/[id].ts
   * @param extensions - Allowed file extensions
   * @returns Pattern or null if skipped
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
   * Recursively scan directory and register routes.
   * @description Imports each route file, validates and adds to router.
   * @param routerInstance - Router to add routes to
   * @param targetDir - Directory to scan
   * @param basePath - Path prefix for route paths
   * @param methods - HTTP methods to register
   * @param extensions - Allowed file extensions
   * @param emit - Optional lifecycle event emitter
   */
  static async explore(
    routerInstance: FastRouter<Types.RouteEntry>,
    targetDir: string,
    basePath: string,
    methods: readonly string[],
    extensions: readonly string[],
    emit?: Types.EventEmit
  ): Promise<void> {
    try {
      for await (const dirEntry of Deno.readDir(targetDir)) {
        const fullPath = `${targetDir}/${dirEntry.name}`
        const routePath = basePath ? `${basePath}/${dirEntry.name}` : dirEntry.name
        if (dirEntry.isDirectory) {
          await Scanner.explore(routerInstance, fullPath, routePath, methods, extensions, emit)
        } else {
          const pathExtension = dirEntry.name.split('.').pop()?.toLowerCase()
          if (!extensions.includes(pathExtension ?? '')) {
            continue
          }
          try {
            const fileModule = await Core.API.importRouteModule(fullPath)
            const routePattern = Scanner.createPattern(routePath, extensions)
            if (routePattern) {
              Scanner.validateModule(fileModule, routePath, methods)
              Scanner.registerHandlers(routerInstance, fileModule, routePattern, methods)
              emit?.(
                Core.Observability.internalEvent('route:loaded', {
                  routePath,
                  pattern: routePattern
                })
              )
            } else if (/[^\x20-\x7E]/.test(dirEntry.name)) {
              emit?.(
                Core.Observability.internalEvent('route:skipped', {
                  routePath,
                  reason: 'filename contains non-ASCII characters'
                })
              )
            }
          } catch (fileError) {
            emit?.(
              Core.Observability.internalEvent('route:error', {
                routePath,
                error: fileError instanceof Error ? fileError : new Error(String(fileError))
              })
            )
          }
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
   * Register handlers from module to router.
   * @description Iterates methods, checks for function exports, adds to router.
   * @param routerInstance - Router to add routes to
   * @param fileModule - Loaded route module
   * @param routePattern - Route URL pattern
   * @param methods - HTTP methods to register
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
      const routeEntry: Types.RouteEntry = {
        kind: 'handler',
        handler: routeHandler,
        pattern: routePattern
      }
      routerInstance.add(method, routePattern, routeEntry)
    }
  }

  /**
   * Ensure module exports one HTTP method.
   * @description Validates at least one method export is a function.
   * @param module - Loaded route module object
   * @param routePath - Path for error messages
   * @param methods - Valid HTTP method names
   * @throws {Deno.errors.InvalidData} When no method or non-function export
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
