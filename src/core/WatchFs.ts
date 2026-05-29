import type * as Types from '@interfaces/index.ts'
import { Async } from '@neabyte/utils-core'
import nodePath from 'node:path'

/**
 * Debounced file system watcher.
 * @description Watches a directory, filters by extension, debounces, then flushes.
 */
export class WatchFs {
  /**
   * Start debounced file watcher.
   * @description Filters by extension, debounces events, then flushes batch.
   * @param options - Directory, extensions, debounce, and flush callback
   */
  static async watch(options: Types.WatchFsOptions): Promise<void> {
    let debounceController: AbortController | null = null
    const pending: Types.WatchedEvent[] = []
    const resolvedDir = nodePath.resolve(options.directory)
    const matchesExtension = (path: string): boolean => {
      const ext = path.split('.').pop()?.toLowerCase() ?? ''
      return options.extensions.includes(ext)
    }
    try {
      const watcher = Deno.watchFs(resolvedDir, { recursive: true })
      for await (const event of watcher) {
        if (event.kind === 'access') {
          continue
        }
        let hasMatch = false
        for (const path of event.paths) {
          if (matchesExtension(path)) {
            pending.push({ kind: event.kind, path })
            hasMatch = true
          }
        }
        if (!hasMatch) {
          continue
        }
        if (debounceController) {
          debounceController.abort()
        }
        debounceController = new AbortController()
        Async.sleepDelay(options.debounceMs, { signal: debounceController.signal })
          .then(async () => {
            debounceController = null
            const batch = pending.splice(0)
            await options.flush(batch)
          })
          .catch(() => {})
      }
    } catch {
      // no-op
    }
  }
}
