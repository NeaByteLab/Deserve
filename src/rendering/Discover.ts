/**
 * Scan directory for .dve templates
 * @description Collects relative paths for Engine validation
 */
export class Discover {
  /** DVE template file extension */
  private static readonly dveExtension = '.dve'

  /**
   * Discover .dve template paths
   * @description Recursively scans viewsDir for templates
   * @param viewsDir - Root directory to scan
   * @returns Set of relative template paths
   */
  static async discoverPaths(viewsDir: string): Promise<Set<string>> {
    const collectedPaths = new Set<string>()
    await Discover.collectPaths(viewsDir, '', collectedPaths)
    return collectedPaths
  }

  /**
   * Collect .dve paths recursively
   * @description Walks directories and accumulates relative paths
   * @param targetDir - Directory to read
   * @param basePath - Current relative path prefix
   * @param collectedPaths - Set to add discovered paths
   */
  private static async collectPaths(
    targetDir: string,
    basePath: string,
    collectedPaths: Set<string>
  ): Promise<void> {
    try {
      for await (const dirEntry of Deno.readDir(targetDir)) {
        const fullPath = `${targetDir}/${dirEntry.name}`
        const relativePath = basePath ? `${basePath}/${dirEntry.name}` : dirEntry.name
        if (dirEntry.isDirectory) {
          await Discover.collectPaths(fullPath, relativePath, collectedPaths)
        } else if (dirEntry.isFile && relativePath.toLowerCase().endsWith(Discover.dveExtension)) {
          collectedPaths.add(relativePath)
        }
      }
    } catch {
      // viewsDir may not exist yet; return empty set
    }
  }
}
