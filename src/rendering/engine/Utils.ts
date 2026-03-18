/**
 * Engine helper utilities
 * @description Provides path lookup and escaping helpers
 */
export class Utils {
  /**
   * Escape HTML special characters
   * @description Converts characters to safe HTML entities
   * @param rawText - Raw text to escape
   * @returns Escaped HTML-safe string
   */
  static escape(rawText: string): string {
    return rawText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  /**
   * Join root and relative path
   * @description Normalizes slashes for filesystem paths
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
   * Lookup dotted path value
   * @description Safely traverses object by path segments
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
      const currentRecord = currentValue as Record<string, unknown>
      currentValue = currentRecord[pathSegment]
    }
    return currentValue
  }
}
