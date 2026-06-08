import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'

/**
 * Worker pool for CPU-bound tasks.
 * @description Payload and result must be structured-clone serializable.
 */
export class Worker {
  /** Marks worker-isolate crash for respawn */
  private static WorkerCrash = class extends Error {
    override readonly cause: Error
    constructor(cause: Error) {
      super('worker crash')
      this.cause = cause
    }
  }
  /** Module URL for spawning workers */
  private readonly scriptURL: string | URL
  /** Per-task dispatch timeout in ms */
  private readonly taskTimeoutMs: number
  /** Round-robin index for next worker */
  private nextIndex = 0
  /** Pooled worker instances */
  private workers: globalThis.Worker[] = []
  /** Per-worker serialization tail promises */
  private workerTails: Promise<void>[] = []

  /**
   * Construct pool with given workers.
   * @description Initializes pool with pre-created worker list.
   * @param workers - Pre-created Deno worker instances
   * @param scriptURL - Module URL for respawning crashed workers
   * @param taskTimeoutMs - Per-task timeout in milliseconds
   */
  private constructor(
    workers: globalThis.Worker[],
    scriptURL: string | URL,
    taskTimeoutMs: number
  ) {
    this.workers = workers
    this.scriptURL = scriptURL
    this.taskTimeoutMs = taskTimeoutMs
    this.workerTails = workers.map(() => Promise.resolve())
  }

  /**
   * Create worker pool from options.
   * @description Spawns module workers from scriptURL, must resolve in app.
   * @param options - scriptURL and optional poolSize
   * @returns Worker with run and terminate
   * @throws {Deno.errors.InvalidData} When taskTimeoutMs is not positive finite
   */
  static createPool(options: Types.WorkerPoolOptions): Worker {
    const requestedPoolSize = options.poolSize ?? Core.Constant.defaultPoolSize
    if (!Number.isFinite(requestedPoolSize)) {
      throw new Deno.errors.InvalidData('Worker poolSize must be a finite number')
    }
    const workerCount = Math.max(1, Math.floor(requestedPoolSize))
    const taskTimeoutMs = options.taskTimeoutMs ?? Core.Constant.defaultWorkerTaskTimeoutMs
    if (!Number.isFinite(taskTimeoutMs) || taskTimeoutMs <= 0) {
      throw new Deno.errors.InvalidData(
        'Worker taskTimeoutMs must be a positive finite number of milliseconds'
      )
    }
    const workerList = Array.from(
      { length: workerCount },
      () => new globalThis.Worker(options.scriptURL, { type: 'module' })
    )
    return new Worker(workerList, options.scriptURL, taskTimeoutMs)
  }

  /**
   * Run one task in worker pool.
   * @description Posts payload, serializes one task per worker.
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
    const workerIndex = this.nextIndex
    this.nextIndex = (this.nextIndex + 1) % this.workers.length
    if (!this.workers[workerIndex]) {
      return Promise.reject(new Deno.errors.BadResource('Worker pool worker at index is missing'))
    }
    const priorTail = this.workerTails[workerIndex] ?? Promise.resolve()
    let releaseTail: () => void = () => {}
    const nextTail = new Promise<void>((resolve) => {
      releaseTail = resolve
    })
    this.workerTails[workerIndex] = nextTail
    const resultPromise = priorTail
      .then(() => {
        const currentWorker = this.workers[workerIndex]!
        return Worker.dispatch<T>(currentWorker, payload, this.taskTimeoutMs).catch(
          (dispatchError) => {
            if (dispatchError instanceof Worker.WorkerCrash) {
              this.respawnWorker(workerIndex, currentWorker)
              throw dispatchError.cause
            }
            throw dispatchError
          }
        )
      })
      .finally(() => {
        if (this.workerTails[workerIndex] === nextTail) {
          this.workerTails[workerIndex] = Promise.resolve()
        }
        releaseTail()
      })
    return resultPromise
  }

  /** Terminate all workers in pool */
  terminate(): void {
    for (const worker of this.workers) {
      worker.terminate()
    }
    this.workers = []
    this.workerTails = []
  }

  /**
   * Dispatch payload and await reply.
   * @description Attaches one-shot listeners, timer respawns hung worker.
   * @template T - Result type from worker
   * @param worker - Target worker instance
   * @param payload - Serializable payload
   * @param taskTimeoutMs - Per-task timeout in milliseconds
   * @returns Promise resolving to worker result
   */
  private static dispatch<T>(
    worker: globalThis.Worker,
    payload: unknown,
    taskTimeoutMs: number
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timeoutTimer)
        worker.removeEventListener('message', onMessage)
        worker.removeEventListener('error', onError)
      }
      const onMessage = (event: MessageEvent) => {
        cleanup()
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
      const onError = (event: ErrorEvent) => {
        event.preventDefault()
        cleanup()
        reject(
          new Worker.WorkerCrash(
            new Deno.errors.BadResource('Worker task failed before responding')
          )
        )
      }
      const timeoutTimer = setTimeout(() => {
        cleanup()
        reject(
          new Worker.WorkerCrash(
            new Deno.errors.TimedOut(`Worker task exceeded ${taskTimeoutMs}ms timeout`)
          )
        )
      }, taskTimeoutMs)
      worker.addEventListener('message', onMessage)
      worker.addEventListener('error', onError)
      try {
        worker.postMessage(payload)
      } catch (postError) {
        cleanup()
        reject(
          new Deno.errors.InvalidData(
            postError instanceof Error
              ? `Worker payload is not serializable ${postError.message}`
              : 'Worker payload is not serializable'
          )
        )
      }
    })
  }

  /**
   * Replace crashed worker by index.
   * @description Respawns dead slot to unblock future dispatches.
   * @param workerIndex - Slot to replace
   * @param deadWorker - The crashed worker to terminate
   */
  private respawnWorker(workerIndex: number, deadWorker: globalThis.Worker): void {
    if (this.workers[workerIndex] !== deadWorker) {
      return
    }
    try {
      deadWorker.terminate()
    } catch {
      void 0
    }
    this.workers[workerIndex] = new globalThis.Worker(this.scriptURL, { type: 'module' })
  }
}
