import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'

/**
 * Engine helper utilities.
 * @description Provides path lookup and escaping helpers.
 */
export class Utils {
  /**
   * Escape HTML special characters.
   * @description Converts characters to safe HTML entities.
   * @param rawText - Raw text to escape
   * @returns Escaped HTML-safe string
   */
  static escape(rawText: string): string {
    return Core.Handler.escapeHtml(rawText)
  }

  /**
   * Join root and relative path.
   * @description Normalizes slashes for filesystem paths.
   * @param rootDir - Root directory path
   * @param relativePath - Relative template path
   * @returns Joined path string
   */
  static join(rootDir: string, relativePath: string): string {
    const normalizedRootDir = rootDir.replace(/\/+$/, '')
    const normalizedRelativePath = relativePath.replace(/^\/+/, '').replace(/\\/g, '/')
    return `${normalizedRootDir}/${normalizedRelativePath}`
  }

  /**
   * Lookup dotted path value.
   * @description Traverses object by dot-separated segments using own properties.
   * @param dataObject - Root data object
   * @param dataPath - Dotted lookup path
   * @returns Resolved value or undefined
   */
  static lookup(dataObject: unknown, dataPath: string): unknown {
    let currentValue: unknown = dataObject
    let scanStart = 0
    const pathLength = dataPath.length
    while (scanStart <= pathLength) {
      let scanEnd = dataPath.indexOf('.', scanStart)
      if (scanEnd === -1) {
        scanEnd = pathLength
      }
      let segStart = scanStart
      let segEnd = scanEnd
      while (segStart < segEnd && dataPath.charCodeAt(segStart) === 32) {
        segStart++
      }
      while (segEnd > segStart && dataPath.charCodeAt(segEnd - 1) === 32) {
        segEnd--
      }
      if (segEnd > segStart) {
        const pathSegment = dataPath.slice(segStart, segEnd)
        currentValue = Utils.readOwn(currentValue, pathSegment)
      }
      scanStart = scanEnd + 1
    }
    return currentValue
  }

  /**
   * Read one own property safely.
   * @description Reads own data properties from object or string bases.
   * @param base - Value to read the property from
   * @param key - Property name to resolve
   * @returns Own property value or undefined when not safely readable
   */
  static readOwn(base: unknown, key: string): unknown {
    if (base === null || base === undefined) {
      return undefined
    }
    if (typeof base !== 'object' && typeof base !== 'string') {
      return undefined
    }
    if (!Object.hasOwn(base as Types.DataRecord, key)) {
      return undefined
    }
    return (base as Types.DataRecord)[key]
  }
}
