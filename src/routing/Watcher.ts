import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'
import * as Routing from '@routing/index.ts'
import { Superwatcher } from '@neabyte/superwatcher'
import { createSequential } from '@neabyte/utils-core'
import nodePath from 'node:path'

/**
 * Route directory file watcher.
 * @description Reloads and removes routes on file changes.
 */
export class Watcher {
  /**
   * Watch routes directory for changes.
   * @description Debounces reloads and removals on filesystem events.
   * @param handler - Route handler to update
   * @param routesDir - Directory path to watch
   * @returns Dispose function stopping the watcher
   */
  static watch(handler: Routing.Handler, routesDir: string): () => void {
    const resolvedDir = nodePath.resolve(routesDir)
    if (!Core.Handler.isDirectory(resolvedDir)) {
      return () => {}
    }
    const extensions = new Set(Core.Constant.allowedExtensions)
    const pendingChanges = new Map<string, Types.RouteChange>()
    const pendingRemovals = new Map<string, string>()
    const drain = createSequential(async () => {
      for (const [routePattern, routePath] of pendingRemovals) {
        handler.removeRoute(routePattern)
        handler.emitEvent(
          Core.Observability.internalEvent('route:removed', { routePath, pattern: routePattern })
        )
      }
      pendingRemovals.clear()
      for (const change of pendingChanges.values()) {
        await handler.reloadRoute(change.fullPath, change.routePath)
      }
      pendingChanges.clear()
    })
    const watcher = new Superwatcher({
      path: resolvedDir,
      debounceMs: Core.Constant.routeDebounceMs,
      ignore: [(path) => !extensions.has(path.split('.').pop()?.toLowerCase() ?? '')],
      onChange(events) {
        for (const event of events) {
          const routePath = event.path.slice(resolvedDir.length + 1)
          const routePattern = Routing.Scanner.createPattern(
            routePath,
            Core.Constant.allowedExtensions
          )
          if (routePattern === null) {
            continue
          }
          if (event.kind === 'remove') {
            pendingChanges.delete(event.path)
            pendingRemovals.set(routePattern, routePath)
          } else {
            pendingRemovals.delete(routePattern)
            pendingChanges.set(event.path, { fullPath: event.path, routePath })
          }
        }
        drain.execute().catch(() => {})
      }
    })
    watcher.start()
    return () => watcher.dispose()
  }
}
