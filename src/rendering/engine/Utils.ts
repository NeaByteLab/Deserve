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
    return Core.Error.escapeHtml(rawText)
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
   * @description Safely traverses object by path segments.
   * @param dataObject - Root data object
   * @param dataPath - Dotted lookup path
   * @returns Resolved value or undefined
   */
  static lookup(dataObject: unknown, dataPath: string): unknown {
    const pathSegments = dataPath
      .split('.')
      .map((pathSegment) => pathSegment.trim())
      .filter(Boolean)
    let currentValue: unknown = dataObject
    for (const pathSegment of pathSegments) {
      if (currentValue === null || currentValue === undefined) {
        return undefined
      }
      if (typeof currentValue !== 'object') {
        return undefined
      }
      const currentRecord = currentValue as Types.DataRecord
      currentValue = currentRecord[pathSegment]
    }
    return currentValue
  }
}
