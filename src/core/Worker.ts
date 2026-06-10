import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'

/**
 * Worker pool for CPU-bound tasks.
 * @description Payload and result must be structured-clone serializable.
 */
export class Worker {
  /** Marks worker-isolate crash for respawn */
  private static workerCrash = class extends Error {
    override readonly cause: Error
    constructor(cause: Error) {
      super('worker crash')
      this.cause = cause
    }
  }
  /** Optional lifecycle event emitter */
  private readonly emit: Types.EventEmit | undefined
  /** Module URL for spawning workers */
  private readonly scriptUrl: string | URL
  /** Per-task dispatch timeout in ms */
  private readonly taskTimeoutMs: number
  /** Maximum pending tasks before fast-rejecting */
  private readonly maxQueueDepth: number
  /** Maximum projected queue wait in ms */
  private readonly maxQueueWaitMs: number
  /** Count of accepted-but-not-settled tasks */
  private pendingCount = 0
  /** Round-robin index for next worker */
  private nextIndex = 0
  /** Pooled worker instances */
  private workers: globalThis.Worker[] = []
  /** Per-worker serialization tail promises */
  private workerTails: Promise<void>[] = []
  /** Per-worker count of pending tasks */
  private slotPending: number[] = []

  /**
   * Construct pool with given workers.
   * @description Initializes pool with pre-created worker list.
   * @param workers - Pre-created Deno worker instances
   * @param scriptUrl - Module URL for respawning crashed workers
   * @param taskTimeoutMs - Per-task timeout in milliseconds
   * @param maxQueueDepth - Maximum pending tasks before fast-rejecting
   * @param maxQueueWaitMs - Maximum projected queue wait before fast-rejecting
   * @param emit - Optional lifecycle event emitter
   */
  private constructor(
    workers: globalThis.Worker[],
    scriptUrl: string | URL,
    taskTimeoutMs: number,
    maxQueueDepth: number,
    maxQueueWaitMs: number,
    emit?: Types.EventEmit
  ) {
    this.emit = emit
    this.workers = workers
    this.scriptUrl = scriptUrl
    this.taskTimeoutMs = taskTimeoutMs
    this.maxQueueDepth = maxQueueDepth
    this.maxQueueWaitMs = maxQueueWaitMs
    this.workerTails = workers.map(() => Promise.resolve())
    this.slotPending = workers.map(() => 0)
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
    const taskTimeoutMs = Core.Handler.assertPositiveFinite(
      options.taskTimeoutMs ?? Core.Constant.defaultWorkerTaskTimeoutMs,
      'Worker taskTimeoutMs',
      'milliseconds'
    )
    const maxQueueDepth = Math.floor(
      Core.Handler.assertPositiveFinite(
        options.maxQueueDepth ?? workerCount * Core.Constant.defaultQueueFactor,
        'Worker maxQueueDepth',
        'tasks'
      )
    )
    const maxQueueWaitMs = Core.Handler.assertPositiveFinite(
      options.maxQueueWaitMs ?? Core.Constant.defaultQueueWaitMs,
      'Worker maxQueueWaitMs',
      'milliseconds'
    )
    const workerList = Array.from(
      { length: workerCount },
      () => new Core.API.Worker(options.scriptURL, { type: 'module' })
    )
    return new Worker(
      workerList,
      options.scriptURL,
      taskTimeoutMs,
      maxQueueDepth,
      maxQueueWaitMs,
      options.emit
    )
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
    if (this.pendingCount >= this.maxQueueDepth) {
      this.emit?.(
        Core.Observability.internalEvent('worker:rejected', {
          reason: 'queue-depth',
          queueDepth: this.pendingCount,
          maxQueueDepth: this.maxQueueDepth
        })
      )
      return Promise.reject(
        new Deno.errors.Busy(
          `Worker pool queue is full (${this.pendingCount}/${this.maxQueueDepth})`
        )
      )
    }
    const workerIndex = this.nextIndex
    this.nextIndex = (this.nextIndex + 1) % this.workers.length
    if (!this.workers[workerIndex]) {
      return Promise.reject(new Deno.errors.BadResource('Worker pool worker at index is missing'))
    }
    const projectedWaitMs = (this.slotPending[workerIndex] ?? 0) * this.taskTimeoutMs
    if (projectedWaitMs > this.maxQueueWaitMs) {
      this.emit?.(
        Core.Observability.internalEvent('worker:rejected', {
          reason: 'queue-wait',
          queueDepth: this.pendingCount,
          maxQueueDepth: this.maxQueueDepth
        })
      )
      return Promise.reject(
        new Deno.errors.Busy(
          `Worker pool slot busy: projected wait ${projectedWaitMs}ms exceeds ${this.maxQueueWaitMs}ms`
        )
      )
    }
    this.pendingCount++
    this.slotPending[workerIndex] = (this.slotPending[workerIndex] ?? 0) + 1
    const priorTail = this.workerTails[workerIndex] ?? Promise.resolve()
    let releaseTail: () => void = () => {}
    const nextTail = new Promise<void>((resolve) => {
      releaseTail = resolve
    })
    this.workerTails[workerIndex] = nextTail
    const resultPromise = priorTail
      .then(() => {
        const currentWorker = this.workers[workerIndex]!
        return Worker.dispatch<T>(
          currentWorker,
          payload,
          this.taskTimeoutMs,
          workerIndex,
          this.emit
        ).catch((dispatchError) => {
          if (dispatchError instanceof Worker.workerCrash) {
            this.respawnWorker(workerIndex, currentWorker)
            throw dispatchError.cause
          }
          throw dispatchError
        })
      })
      .finally(() => {
        this.pendingCount--
        this.slotPending[workerIndex] = Math.max(0, (this.slotPending[workerIndex] ?? 1) - 1)
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
    this.slotPending = []
  }

  /**
   * Dispatch payload and await reply.
   * @description Attaches one-shot listeners, timer respawns hung worker.
   * @template T - Result type from worker
   * @param worker - Target worker instance
   * @param payload - Serializable payload
   * @param taskTimeoutMs - Per-task timeout in milliseconds
   * @param workerIndex - Pool slot index for event metadata
   * @param emit - Optional lifecycle event emitter
   * @returns Promise resolving to worker result
   */
  private static dispatch<T>(
    worker: globalThis.Worker,
    payload: unknown,
    taskTimeoutMs: number,
    workerIndex: number,
    emit?: Types.EventEmit
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
        const crashError = new Deno.errors.BadResource('Worker task failed before responding')
        emit?.(Core.Observability.internalEvent('worker:crash', { workerIndex, error: crashError }))
        reject(new Worker.workerCrash(crashError))
      }
      const timeoutTimer = setTimeout(() => {
        cleanup()
        const timeoutError = new Deno.errors.TimedOut(
          `Worker task exceeded ${taskTimeoutMs}ms timeout`
        )
        emit?.(
          Core.Observability.internalEvent('worker:timeout', {
            timeoutMs: taskTimeoutMs,
            workerIndex,
            error: timeoutError
          })
        )
        reject(new Worker.workerCrash(timeoutError))
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
    this.workers[workerIndex] = new Core.API.Worker(this.scriptUrl, { type: 'module' })
    this.emit?.(Core.Observability.internalEvent('worker:respawn', { workerIndex }))
  }
}
