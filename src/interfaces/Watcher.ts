/** Watched file event for flush. */
export type WatchedEvent = Readonly<{
  /** File system event kind */
  kind: Deno.FsEvent['kind']
  /** Absolute path of changed file */
  path: string
}>

/** Debounced file watcher options. */
export type WatchFsOptions = Readonly<{
  /** Debounce delay in milliseconds */
  debounceMs: number
  /** Directory to watch */
  directory: string
  /** File extensions to filter */
  extensions: readonly string[]
  /** Called with batched events after debounce */
  flush: (events: WatchedEvent[]) => void | Promise<void>
}>
