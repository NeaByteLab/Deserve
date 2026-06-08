import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'
import * as EngineParts from '@rendering/engine/index.ts'
import { Superwatcher } from '@neabyte/superwatcher'
import nodePath from 'node:path'

/**
 * File watcher for DVE templates.
 * @description Watches viewsDir and invalidates Engine caches on change.
 */
export class Watcher {
  /**
   * Start watching template directory.
   * @description Uses Superwatcher with cache invalidation.
   * @param engine - Engine instance to invalidate
   * @returns Stop handle releasing the watcher
   */
  static watch(engine: Types.WatchableEngine): () => void {
    const viewsDir = engine.viewsDir
    const resolvedDir = nodePath.resolve(viewsDir)
    if (!Core.Handler.isDirectory(resolvedDir)) {
      return () => {}
    }
    const watcher = new Superwatcher({
      path: resolvedDir,
      debounceMs: Core.Constant.templateDebounceMs,
      ignore: [(path: string) => !path.endsWith(Core.Constant.dveExtension)],
      onChange(events) {
        const refreshedPaths: string[] = []
        for (const event of events) {
          const relativePath = event.path.slice(resolvedDir.length + 1)
          const absPath = EngineParts.Utils.join(viewsDir, relativePath)
          engine.invalidateFile(absPath)
          refreshedPaths.push(absPath)
        }
        if (events.length > 0) {
          engine.refreshPaths()
          engine.notifyRefresh(refreshedPaths)
        }
      }
    })
    watcher.start()
    return () => watcher.dispose()
  }
}
