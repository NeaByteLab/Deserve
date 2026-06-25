import * as Core from '@core/index.ts'
import { Superwatcher } from '@neabyte/superwatcher'
import nodePath from 'node:path'

/**
 * Template directory file watcher.
 * @description Invalidates view cache on template changes.
 */
export class View {
  /**
   * Watch template directory for changes.
   * @description Invalidates engine cache on DVE file events.
   * @param engine - Rendering engine to invalidate
   * @returns Disposer function stopping the watcher
   */
  static watch(engine: Core.Rendering): () => void {
    const resolvedDir = nodePath.resolve(engine.directory)
    if (!Core.Handler.isDirectory(resolvedDir)) {
      return () => {}
    }
    const watcher = new Superwatcher({
      path: resolvedDir,
      debounceMs: Core.Constant.templateDebounceMs,
      ignore: [(path) => !path.endsWith(Core.Constant.dveExtension)],
      onChange(events) {
        for (const event of events) {
          engine.invalidate(event.path.slice(resolvedDir.length + 1))
        }
      }
    })
    watcher.start()
    return () => watcher.dispose()
  }
}
