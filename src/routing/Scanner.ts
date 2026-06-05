import type * as Types from '@interfaces/index.ts'
import type { FastRouter } from '@neabyte/fast-router'
import Stackz from '@neabyte/stackz'
import nodeUrl from 'node:url'

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
    const pathWithoutExt = routePath.slice(0, -`.${pathExtension}`.length)
    const segments = pathWithoutExt.split('/')
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
    let pathPattern = `/${pathWithoutExt}`.replace(/\[([^\]]+)\]/g, ':$1')
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
            const fileModule = await import(nodeUrl.pathToFileURL(fullPath).href)
            const routePattern = Scanner.createPattern(routePath, extensions)
            if (routePattern) {
              Scanner.validateModule(fileModule, routePath, methods)
              Scanner.registerHandlers(routerInstance, fileModule, routePattern, methods)
            } else if (/[^\x20-\x7E]/.test(dirEntry.name)) {
              console.warn(
                `[Deserve] Skipped route "${routePath}" because filename contains non-ASCII characters`
              )
            }
          } catch (fileError) {
            const formatted = fileError instanceof globalThis.Error
              ? `\n${await Stackz.format(fileError, 'detailed')}\n`
              : String(fileError)
            console.error(`[Deserve] Skipped route file ${routePath}\n${formatted}`)
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
    routerInstance: FastRouter<Types.RouteMetadata>,
    fileModule: Record<string, unknown>,
    routePattern: string,
    methods: readonly string[]
  ): void {
    for (const method of methods) {
      const routeHandler = fileModule[method] as Types.RouteHandler | undefined
      if (typeof routeHandler !== 'function') {
        continue
      }
      const metadata: Types.RouteMetadata = { handler: routeHandler, pattern: routePattern }
      routerInstance.add(method, routePattern, metadata)
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
    module: Record<string, unknown>,
    routePath: string,
    methods: readonly string[]
  ): void {
    const exportedMethods = Object.keys(module).filter((methodName) => methods.includes(methodName))
    if (exportedMethods.length === 0) {
      throw new Deno.errors.InvalidData(
        `Route "${routePath}" must export at least one HTTP method (${methods.join(', ')})`
      )
    }
    for (const [methodName, exportValue] of Object.entries(module)) {
      if (methods.includes(methodName)) {
        if (typeof exportValue !== 'function') {
          throw new TypeError(
            `Route "${routePath}" export "${methodName}" must be a function, got ${typeof exportValue}`
          )
        }
      }
    }
  }
}
