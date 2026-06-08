import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'
import * as Routing from '@routing/index.ts'
import { Superwatcher } from '@neabyte/superwatcher'
import { createSequential } from '@neabyte/utils-core'
import nodePath from 'node:path'

/**
 * File watcher for route modules.
 * @description Watches routesDir and hot-reloads routes on change.
 */
export class Watcher {
  /**
   * Start watching routes directory.
   * @description Uses Superwatcher with sequential reloading.
   * @param handler - Handler instance to reload routes on
   * @param routesDir - Routes directory to watch
   * @returns Stop handle releasing the watcher
   */
  static watch(handler: Routing.Handler, routesDir: string): () => void {
    const extensions = Core.Constant.allowedExtensions
    const extensionSet: Set<string> = new Set(extensions)
    const resolvedDir = nodePath.resolve(routesDir)
    if (!Core.Handler.isDirectory(resolvedDir)) {
      return () => {}
    }
    const reloader = createSequential(async () => {
      for (const routePath of pendingRemovals) {
        const routePattern = Routing.Scanner.createPattern(routePath, extensions)
        if (routePattern) {
          handler.removeRoute(routePattern, routePath)
        }
      }
      for (const entry of pendingChanges.values()) {
        await handler.reloadRoute(entry.fullPath, entry.routePath)
      }
      pendingChanges.clear()
      pendingRemovals.clear()
    })
    const pendingChanges = new Map<string, Types.RouteChangeEntry>()
    const pendingRemovals = new Set<string>()
    const watcher = new Superwatcher({
      path: resolvedDir,
      debounceMs: Core.Constant.routeDebounceMs,
      ignore: [
        (path: string) => {
          const fileExtension = path.split('.').pop()?.toLowerCase() ?? ''
          return !extensionSet.has(fileExtension)
        }
      ],
      onChange(events) {
        for (const event of events) {
          const routePath = event.path.slice(resolvedDir.length + 1)
          if (event.kind === 'remove') {
            pendingRemovals.add(routePath)
            pendingChanges.delete(event.path)
          } else {
            pendingRemovals.delete(routePath)
            pendingChanges.set(event.path, { fullPath: event.path, routePath })
          }
        }
        reloader.execute().catch(() => {})
      }
    })
    watcher.start()
    return () => watcher.dispose()
  }
}
