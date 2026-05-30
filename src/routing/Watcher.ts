import type * as Types from '@interfaces/index.ts'
import { Superwatcher } from '@neabyte/superwatcher'
import { createSequential } from '@neabyte/utils-core'
import * as Core from '@core/index.ts'
import * as Routing from '@routing/index.ts'
import nodePath from 'node:path'

/**
 * File watcher for route modules.
 * @description Watches routesDir and hot-reloads routes on change.
 */
export class Watcher {
  /** Debounce delay in milliseconds */
  private static readonly debounceMs = 150

  /**
   * Start watching routes directory.
   * @description Uses Superwatcher with sequential reloading.
   * @param handler - Handler instance to reload routes on
   * @param routesDir - Routes directory to watch
   */
  static watch(handler: Routing.Handler, routesDir: string): void {
    const extensions = Core.Constant.allowedExtensions
    const extensionSet: Set<string> = new Set(extensions)
    const resolvedDir = nodePath.resolve(routesDir)
    const reloader = createSequential(async () => {
      for (const routePath of pendingRemovals) {
        const pattern = Routing.Scanner.createPattern(routePath, extensions)
        if (pattern) {
          handler.removeRoute(pattern)
        }
      }
      for (const [, entry] of pendingChanges) {
        await handler.reloadRoute(entry.fullPath, entry.routePath)
      }
      pendingChanges.clear()
      pendingRemovals.clear()
    })
    const pendingChanges = new Map<string, Types.RouteChangeEntry>()
    const pendingRemovals = new Set<string>()
    const watcher = new Superwatcher({
      path: resolvedDir,
      debounceMs: Watcher.debounceMs,
      ignore: [
        (path: string) => {
          const ext = path.split('.').pop()?.toLowerCase() ?? ''
          return !extensionSet.has(ext)
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
  }
}
