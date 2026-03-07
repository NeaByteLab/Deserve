import type * as Types from '@app/index.ts'
import type { FastRouter } from '@neabyte/fast-router'
import { pathToFileURL } from 'node:url'

/**
 * File-based route discovery and pattern creation.
 * @description Walks directory; converts paths to route patterns.
 */
export class Scanner {
  /**
   * Convert file path to router pattern.
   * @description Drops extension; [id] to :id; /index to /.
   * @param routePath - Relative path like users/[id].ts
   * @param extensions - Allowed file extensions
   * @returns Pattern or null if skipped
   */
  static createPattern(routePath: string, extensions: readonly string[]): string | null {
    const pathExtension = routePath.split('.').pop()?.toLowerCase() ?? ''
    if (!extensions.includes(pathExtension)) {
      return null
    }
    const pathWithoutExt = routePath.slice(0, -`.${pathExtension}`.length)
    if (
      pathWithoutExt
        .split('/')
        .some((pathSegment) => pathSegment.startsWith('_') || pathSegment.startsWith('@'))
    ) {
      return null
    }
    const pathLastSegment = pathWithoutExt.split('/').pop()
    if (!/^[a-zA-Z0-9_\[\].~\-+]+$/.test(pathLastSegment ?? '')) {
      return null
    }
    let pathPattern = `/${pathWithoutExt}`.replace(/\[([^\]]+)\]/g, ':$1')
    if (pathPattern.toLowerCase().endsWith('/index')) {
      pathPattern = pathPattern.slice(0, -6) || '/'
    }
    return pathPattern
  }

  /**
   * Recursively scan directory and register routes.
   * @description Imports each route file; validates and adds to router.
   * @param routerInstance - Router to add routes to
   * @param targetDir - Directory to scan
   * @param basePath - Path prefix for route paths
   * @param methods - HTTP methods to register
   * @param extensions - Allowed file extensions
   */
  static async explore(
    routerInstance: FastRouter<Types.RouteMetadata>,
    targetDir: string,
    basePath: string,
    methods: readonly string[],
    extensions: readonly string[]
  ): Promise<void> {
    try {
      for await (const dirEntry of Deno.readDir(targetDir)) {
        const fullPath = `${targetDir}/${dirEntry.name}`
        const routePath = basePath ? `${basePath}/${dirEntry.name}` : dirEntry.name
        if (dirEntry.isDirectory) {
          await Scanner.explore(routerInstance, fullPath, routePath, methods, extensions)
        } else {
          const pathExtension = dirEntry.name.split('.').pop()?.toLowerCase()
          if (!extensions.includes(pathExtension ?? '')) {
            continue
          }
          try {
            const fileModule = await import(pathToFileURL(fullPath).href)
            const routePattern = Scanner.createPattern(routePath, extensions)
            if (routePattern) {
              Scanner.validateModule(fileModule, routePath, methods)
              for (const method of methods) {
                const handler = fileModule[method] as Types.RouteHandler | undefined
                if (typeof handler !== 'function') {
                  continue
                }
                const metadata: Types.RouteMetadata = {
                  handler,
                  pattern: routePattern
                }
                routerInstance.add(method, routePattern, metadata)
              }
            }
          } catch (fileError) {
            const errorMessage = fileError instanceof Error ? fileError.message : String(fileError)
            console.error(`[Deserve] Skipped route file ${routePath}: ${errorMessage}`)
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
   * Ensure module exports one HTTP method.
   * @description Validates at least one method export is a function.
   * @param module - Loaded route module object
   * @param routePath - Path for error messages
   * @param methods - Valid HTTP method names
   * @throws {Error} When no method or non-function export
   */
  static validateModule(
    module: Record<string, unknown>,
    routePath: string,
    methods: readonly string[]
  ): void {
    const exportedMethods = Object.keys(module).filter((key) => methods.includes(key))
    if (exportedMethods.length === 0) {
      throw new Error(
        `Route ${routePath}: Must export at least one HTTP method (${methods.join(', ')})`
      )
    }
    for (const [key, value] of Object.entries(module)) {
      if (methods.includes(key)) {
        if (typeof value !== 'function') {
          throw new Error(`Route ${routePath}: ${key} must be a function, got ${typeof value}`)
        }
      }
    }
  }
}
