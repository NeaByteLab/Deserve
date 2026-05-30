import type * as Types from '@interfaces/index.ts'
import { Superwatcher } from '@neabyte/superwatcher'
import * as EngineParts from '@rendering/engine/index.ts'
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
   * @description Uses Superwatcher with cache invalidation.
   * @param engine - Engine instance to invalidate
   */
  static watch(engine: Types.WatchableEngine): void {
    const viewsDir = engine.viewsDir
    const resolvedDir = nodePath.resolve(viewsDir)
    const watcher = new Superwatcher({
      path: resolvedDir,
      debounceMs: Watcher.debounceMs,
      ignore: [(path: string) => !path.endsWith('.dve')],
      onChange(events) {
        for (const event of events) {
          const relativePath = event.path.slice(resolvedDir.length + 1)
          const absPath = EngineParts.Utils.join(viewsDir, relativePath)
          engine.invalidateFile(absPath)
        }
        if (events.length > 0) {
          engine.refreshPaths()
        }
      }
    })
    watcher.start()
  }
}
