/** Options to create a worker pool; scriptURL must be module URL. */
export interface WorkerPoolOptions {
  /** Number of workers in pool; default 4 */
  poolSize?: number
  /** Worker script URL (e.g. import.meta.resolve('./worker.ts')) */
  scriptURL: string
}

/** Run a task in the worker pool; payload and result must be structured-clone serializable. */
export interface WorkerRunHandle {
  /** Send payload to a worker and resolve with result. */
  run<T = unknown>(payload: unknown): Promise<T>
}
