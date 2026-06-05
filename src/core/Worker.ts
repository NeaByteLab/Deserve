import type * as Types from '@interfaces/index.ts'

/**
 * Worker pool for CPU-bound tasks.
 * @description Payload and result must be structured-clone serializable.
 */
export class Worker {
  /** Default worker count when poolSize omitted */
  private static readonly defaultPoolSize = 4
  /** Round-robin index for next worker */
  private nextIndex = 0
  /** Pooled worker instances */
  private workers: globalThis.Worker[] = []

  /**
   * Construct pool with given workers.
   * @description Initializes pool with pre-created worker list.
   * @param workers - Pre-created Deno worker instances
   */
  private constructor(workers: globalThis.Worker[]) {
    this.workers = workers
  }

  /**
   * Create worker pool from options.
   * @description Spawns module workers from scriptURL, must resolve in app.
   * @param options - scriptURL and optional poolSize
   * @returns Worker with run and terminate
   */
  static createPool(options: Types.WorkerPoolOptions): Worker {
    const workerCount = Math.max(1, options.poolSize ?? Worker.defaultPoolSize)
    const workerList = Array.from(
      { length: workerCount },
      () => new globalThis.Worker(options.scriptURL, { type: 'module' })
    )
    return new Worker(workerList)
  }

  /**
   * Run one task in worker pool.
   * @description Sends payload via postMessage, returns worker result.
   * @template T - Result type from worker
   * @param payload - Serializable payload for the worker
   * @returns Promise resolving to worker result
   * @throws {Deno.errors.BadResource} When pool empty or worker missing
   * @throws {Deno.errors.InvalidData} When worker returns error payload
   */
  run<T = unknown>(payload: unknown): Promise<T> {
    if (this.workers.length === 0) {
      return Promise.reject(new Deno.errors.BadResource('Worker pool has no available workers'))
    }
    const index = this.nextIndex % this.workers.length
    this.nextIndex++
    const worker = this.workers[index]
    if (!worker) {
      return Promise.reject(new Deno.errors.BadResource('Worker pool worker at index is missing'))
    }
    return new Promise<T>((resolve, reject) => {
      const onMessage = (event: MessageEvent) => {
        worker.removeEventListener('message', onMessage)
        worker.removeEventListener('error', onError)
        const messageData = event.data as Types.WorkerMessageData
        if (messageData && typeof messageData === 'object' && messageData.error === true) {
          reject(
            new Deno.errors.InvalidData(
              messageData.message ?? 'Worker returned an error with no message'
            )
          )
        } else {
          resolve(event.data as T)
        }
      }
      const onError = () => {
        worker.removeEventListener('message', onMessage)
        worker.removeEventListener('error', onError)
        reject(new Deno.errors.BadResource('Worker terminated unexpectedly before responding'))
      }
      worker.addEventListener('message', onMessage)
      worker.addEventListener('error', onError)
      worker.postMessage(payload)
    })
  }

  /**
   * Terminate all workers in pool.
   * @description Call on shutdown to release resources.
   */
  terminate(): void {
    for (const worker of this.workers) {
      worker.terminate()
    }
    this.workers = []
  }
}
