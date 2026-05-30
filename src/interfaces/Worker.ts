/** Worker message payload with optional error. */
export interface WorkerMessageData {
  /** True when worker signals an error */
  readonly error?: boolean
  /** Error or result message */
  readonly message?: string
}

/** Worker pool creation options. */
export interface WorkerPoolOptions {
  /** Number of workers, default 4 */
  readonly poolSize?: number
  /** Module URL for worker script */
  readonly scriptURL: string
}

/** Handle to run worker tasks. */
export interface WorkerRunHandle {
  /**
   * Run payload in worker pool.
   * @description Sends payload to worker and resolves result.
   * @param payload - Structured-clone serializable data
   * @returns Promise resolving with worker result
   * @template T - Expected result type
   */
  run<T = unknown>(payload: unknown): Promise<T>
}
