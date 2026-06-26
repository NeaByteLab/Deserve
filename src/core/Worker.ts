import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'

/**
 * Worker pool task dispatcher.
 * @description Dispatches tasks across workers with queue limits.
 */
export class Worker {
  /** Optional event emitter for worker events */
  readonly #emit: Types.EventFn | null
  /** Maximum pending tasks across pool */
  readonly #maxQueueDepth: number
  /** Maximum projected slot wait milliseconds */
  readonly #maxQueueWaitMs: number
  /** Worker script URL for respawn */
  readonly #scriptUrl: string
  /** Per task timeout in milliseconds */
  readonly #taskTimeoutMs: number
  /** Round robin next worker index */
  #nextIndex = 0
  /** Total pending tasks across pool */
  #pendingCount = 0
  /** Pending task count per worker slot */
  #slotPending: number[]
  /** Active worker instances in pool */
  #workers: globalThis.Worker[]
  /** Tail promise chain per worker slot */
  #workerTails: Promise<void>[]

  /**
   * Construct worker pool instance.
   * @description Initializes workers, slots, and tail chains.
   * @param workers - Worker instances in pool
   * @param scriptUrl - Worker script URL for respawn
   * @param taskTimeoutMs - Per task timeout milliseconds
   * @param maxQueueDepth - Maximum pending task count
   * @param maxQueueWaitMs - Maximum projected wait milliseconds
   * @param emit - Optional event emitter callback
   */
  private constructor(
    workers: globalThis.Worker[],
    scriptUrl: string,
    taskTimeoutMs: number,
    maxQueueDepth: number,
    maxQueueWaitMs: number,
    emit: Types.EventFn | null
  ) {
    this.#emit = emit
    this.#maxQueueDepth = maxQueueDepth
    this.#maxQueueWaitMs = maxQueueWaitMs
    this.#scriptUrl = scriptUrl
    this.#slotPending = workers.map(() => 0)
    this.#taskTimeoutMs = taskTimeoutMs
    this.#workers = workers
    this.#workerTails = workers.map(() => Promise.resolve())
  }

  /**
   * Create configured worker pool.
   * @description Validates options and spawns worker instances.
   * @param options - Worker pool configuration options
   * @param emit - Optional event emitter callback
   * @returns Constructed worker pool instance
   */
  static createPool(
    options: Types.WorkerPoolOptions,
    emit: Types.EventFn | null = null
  ): Worker {
    const poolSize = Math.max(
      1,
      Math.floor(
        Core.Handler.assertPositiveFinite(
          options.poolSize ?? Core.Constant.defaultPoolSize,
          'Worker poolSize',
          'workers'
        )
      )
    )
    const taskTimeoutMs = Core.Handler.assertPositiveFinite(
      options.taskTimeoutMs ?? Core.Constant.defaultWorkerTaskTimeoutMs,
      'Worker taskTimeoutMs',
      'milliseconds'
    )
    const maxQueueDepth = Math.floor(
      Core.Handler.assertPositiveFinite(
        options.maxQueueDepth ?? poolSize * Core.Constant.defaultQueueFactor,
        'Worker maxQueueDepth',
        'tasks'
      )
    )
    const maxQueueWaitMs = Core.Handler.assertPositiveFinite(
      options.maxQueueWaitMs ?? Core.Constant.defaultQueueWaitMs,
      'Worker maxQueueWaitMs',
      'milliseconds'
    )
    const workers = Array.from(
      { length: poolSize },
      () => new Core.API.Worker(options.scriptURL, { type: 'module' })
    )
    return new Worker(
      workers,
      options.scriptURL,
      taskTimeoutMs,
      maxQueueDepth,
      maxQueueWaitMs,
      emit
    )
  }

  /**
   * Run task on worker pool.
   * @description Enforces queue depth and projected wait limits.
   * @param payload - Task payload to dispatch
   * @returns Promise resolving to task result
   * @throws When pool empty or queue full
   * @template T - Task result value type
   */
  run<T = unknown>(payload: unknown): Promise<T> {
    if (this.#workers.length === 0) {
      return Promise.reject(new Deno.errors.BadResource('Worker pool has no available workers'))
    }
    if (this.#pendingCount >= this.#maxQueueDepth) {
      this.#emit?.(
        Core.Observability.internalEvent('worker:rejected', {
          reason: 'queue-depth',
          queueDepth: this.#pendingCount,
          maxQueueDepth: this.#maxQueueDepth
        })
      )
      return Promise.reject(
        new Deno.errors.Busy(
          `Worker pool queue is full at ${this.#pendingCount} of ${this.#maxQueueDepth}`
        )
      )
    }
    const workerIndex = this.#nextIndex
    this.#nextIndex = (this.#nextIndex + 1) % this.#workers.length
    const projectedWaitMs = (this.#slotPending[workerIndex] ?? 0) * this.#taskTimeoutMs
    if (projectedWaitMs > this.#maxQueueWaitMs) {
      this.#emit?.(
        Core.Observability.internalEvent('worker:rejected', {
          reason: 'queue-wait',
          queueDepth: this.#pendingCount,
          maxQueueDepth: this.#maxQueueDepth
        })
      )
      return Promise.reject(
        new Deno.errors.Busy(
          `Worker pool slot busy with projected wait ${projectedWaitMs}ms over ${this.#maxQueueWaitMs}ms`
        )
      )
    }
    this.#pendingCount += 1
    this.#slotPending[workerIndex] = (this.#slotPending[workerIndex] ?? 0) + 1
    const priorTail = this.#workerTails[workerIndex] ?? Promise.resolve()
    let releaseTail: () => void = () => {}
    const nextTail = new Promise<void>((resolve) => {
      releaseTail = resolve
    })
    this.#workerTails[workerIndex] = nextTail
    return priorTail
      .then(() => {
        const currentWorker = this.#workers[workerIndex]
        if (currentWorker === undefined) {
          throw new Deno.errors.BadResource('Worker pool worker at index is missing')
        }
        return Worker.#dispatch<T>(
          currentWorker,
          payload,
          this.#taskTimeoutMs,
          workerIndex,
          this.#emit
        ).catch((dispatchError) => {
          if (
            dispatchError instanceof Deno.errors.BadResource ||
            dispatchError instanceof Deno.errors.TimedOut
          ) {
            this.#respawn(workerIndex, currentWorker)
          }
          throw dispatchError
        })
      })
      .finally(() => {
        this.#pendingCount -= 1
        this.#slotPending[workerIndex] = Math.max(0, (this.#slotPending[workerIndex] ?? 1) - 1)
        if (this.#workerTails[workerIndex] === nextTail) {
          this.#workerTails[workerIndex] = Promise.resolve()
        }
        releaseTail()
      })
  }

  /** Terminate all workers and reset pool */
  terminate(): void {
    for (const worker of this.#workers) {
      worker.terminate()
    }
    this.#slotPending = []
    this.#workers = []
    this.#workerTails = []
  }

  /**
   * Dispatch payload to single worker.
   * @description Resolves on message, rejects on error or timeout.
   * @param worker - Target worker instance
   * @param payload - Task payload to post
   * @param taskTimeoutMs - Task timeout milliseconds
   * @param workerIndex - Worker index for events
   * @param emit - Optional event emitter callback
   * @returns Promise resolving to task result
   * @throws When worker errors, times out, or payload unserializable
   * @template T - Task result value type
   */
  static #dispatch<T>(
    worker: globalThis.Worker,
    payload: unknown,
    taskTimeoutMs: number,
    workerIndex: number,
    emit: Types.EventFn | null
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
          return
        }
        resolve(event.data as T)
      }
      const onError = (event: ErrorEvent) => {
        event.preventDefault()
        cleanup()
        const crashError = new Deno.errors.BadResource('Worker task failed before responding')
        emit?.(
          Core.Observability.internalEvent('worker:crashed', {
            index: workerIndex,
            error: crashError
          })
        )
        reject(crashError)
      }
      const timeoutTimer = setTimeout(() => {
        cleanup()
        const timeoutError = new Deno.errors.TimedOut(
          `Worker task exceeded ${taskTimeoutMs}ms timeout`
        )
        emit?.(
          Core.Observability.internalEvent('worker:timeout', {
            timeoutMs: taskTimeoutMs,
            index: workerIndex,
            error: timeoutError
          })
        )
        reject(timeoutError)
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
   * Respawn crashed worker slot.
   * @description Replaces dead worker and emits respawn event.
   * @param workerIndex - Worker slot index to respawn
   * @param deadWorker - Crashed worker instance
   */
  #respawn(workerIndex: number, deadWorker: globalThis.Worker): void {
    if (this.#workers[workerIndex] !== deadWorker) {
      return
    }
    try {
      deadWorker.terminate()
    } catch {
      void 0
    }
    this.#workers[workerIndex] = new Core.API.Worker(this.#scriptUrl, { type: 'module' })
    this.#emit?.(Core.Observability.internalEvent('worker:respawned', { index: workerIndex }))
  }
}
