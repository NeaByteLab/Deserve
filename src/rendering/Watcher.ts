import type { Engine } from '@rendering/Engine.ts'
import * as EngineParts from '@rendering/engine/index.ts'
import * as Core from '@core/index.ts'
import nodePath from 'node:path'

/**
 * File watcher for DVE templates.
 * @description Watches viewsDir and invalidates Engine caches on change.
 */
export class Watcher {
  /** Debounce delay in milliseconds */
  private static readonly debounceMs = 100

  /**
   * Start watching template directory.
   * @description Uses debounced watchFs with cache invalidation.
   * @param engine - Engine instance to invalidate
   */
  static async watch(engine: Engine): Promise<void> {
    const viewsDir = engine.viewsDir
    const resolvedDir = nodePath.resolve(viewsDir)
    await Core.WatchFs.watch({
      directory: viewsDir,
      extensions: ['dve'],
      debounceMs: Watcher.debounceMs,
      flush(events) {
        let needsRefresh = false
        for (const event of events) {
          const relativePath = event.path.slice(resolvedDir.length + 1)
          const absPath = EngineParts.Utils.join(viewsDir, relativePath)
          engine.invalidateFile(absPath)
          needsRefresh = true
        }
        if (needsRefresh) {
          engine.refreshPaths()
        }
      }
    })
  }
}
