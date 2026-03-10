import type * as Types from '@app/Types.ts'

/**
 * Worker pool for CPU-bound tasks.
 * @description Payload and result must be structured-clone serializable.
 */
export class WorkerPool {
  /** Default worker count when poolSize omitted */
  private static readonly defaultPoolSize = 4
  /** Round-robin index for next worker */
  private nextIndex = 0
  /** Pooled worker instances */
  private workers: Worker[] = []

  /**
   * Construct pool with given workers.
   * @description Initializes pool with pre-created worker list.
   * @param workers - Pre-created Deno worker instances
   */
  private constructor(workers: Worker[]) {
    this.workers = workers
  }

  /**
   * Create worker pool from options.
   * @description Spawns module workers from scriptURL; must resolve in app.
   * @param options - scriptURL and optional poolSize
   * @returns WorkerPool with run and terminate
   */
  static createPool(options: Types.WorkerPoolOptions): WorkerPool {
    const workerCount = Math.max(1, options.poolSize ?? WorkerPool.defaultPoolSize)
    const workerList: Worker[] = []
    for (let index = 0; index < workerCount; index++) {
      workerList.push(
        new Worker(options.scriptURL, {
          type: 'module'
        })
      )
    }
    return new WorkerPool(workerList)
  }

  /**
   * Run one task in worker pool.
   * @description Sends payload via postMessage; worker posts result back.
   * @param payload - Serializable payload for the worker
   * @returns Promise resolving to worker result
   */
  run<T = unknown>(payload: unknown): Promise<T> {
    if (this.workers.length === 0) {
      return Promise.reject(new Error('Worker pool has no workers'))
    }
    const index = this.nextIndex % this.workers.length
    this.nextIndex++
    const worker = this.workers[index]
    if (!worker) {
      return Promise.reject(new Error('Worker pool worker missing'))
    }
    return new Promise<T>((resolve, reject) => {
      const onMessage = (event: MessageEvent) => {
        worker.removeEventListener('message', onMessage)
        worker.removeEventListener('error', onError)
        const messageData = event.data as { error?: boolean; message?: string }
        if (messageData && typeof messageData === 'object' && messageData.error === true) {
          reject(new Error(messageData.message ?? 'Worker reported error'))
        } else {
          resolve(event.data as T)
        }
      }
      const onError = () => {
        worker.removeEventListener('message', onMessage)
        worker.removeEventListener('error', onError)
        reject(new Error('Worker error'))
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
