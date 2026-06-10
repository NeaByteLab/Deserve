---
description: "Offloading CPU-bound work to a pool of Deno workers via the Deserve worker pool API."
---

# Worker Pool

> **Reference**: [Deno Workers API](https://docs.deno.com/runtime/manual/workers/)

The worker pool offloads CPU-bound work to a pool of Deno Workers so the main thread stays responsive. Once a worker pool is configured, route handlers reach the worker handle through `ctx.getState('worker' as never)` and dispatch tasks with `run(payload)`.

## When to Use

Use the worker pool when a route does **CPU-bound work** (e.g. heavy math, parsing, compression) that would block the event loop. For I/O-bound work (file, network), the main thread is usually enough.

## Basic Usage

### 1. Configure Router with Worker

Pass `worker` when creating the router, along with a **script URL** that resolves to a module (for example via `import.meta.resolve()` or `URL.createObjectURL()` for inline code):

```typescript twoslash
import { Router } from '@neabyte/deserve'

// Resolve worker script as a module
const workerScriptUrl = import.meta.resolve('./worker.ts')

// Enable the pool on the router
const router = new Router({
  routesDir: './routes',
  worker: {
    scriptURL: workerScriptUrl,
    poolSize: 4
  }
})

await router.serve(8000)
```

### 2. Implement the Worker Script

The worker script must listen for `message` and reply with `postMessage`. Payload and result must be **structured-clone serializable** (no functions or symbols):

```typescript
// worker.ts
self.onmessage = (e: MessageEvent) => {
  const data = e.data as { iterations?: number }
  const n = Math.max(0, Number(data?.iterations) || 50_000)
  let value = 0
  for (let i = 0; i < n; i++) {
    value += Math.sqrt(i)
  }
  self.postMessage({
    done: true,
    value
  })
}
```

To report an error from the worker, send an object with `error: true` and optional `message`:

```typescript
self.postMessage({
  error: true,
  message: 'Computation failed'
})
```

### 3. Use in a Route

The worker handle lives in framework state, so `ctx.getState` reaches it with the `WorkerRunHandle` type. A router created without `worker` leaves the handle undefined, which is the moment to return 503:

```typescript twoslash
// routes/heavy.ts
import type { Context, WorkerRunHandle } from '@neabyte/deserve'

export async function GET(ctx: Context): Promise<Response> {
  const worker = ctx.getState<WorkerRunHandle>('worker' as never)
  if (!worker) {
    return ctx.send.json(
      {
        error: 'Worker not enabled'
      },
      {
        status: 503
      }
    )
  }
  const result = await worker.run<{ done: boolean; value: number }>({
    iterations: 50_000
  })
  return ctx.send.json({
    value: result?.value
  })
}
```

## Router Options

### `scriptURL`

Worker script URL. Must point to a **module** (Deno runs workers with `type: 'module'`). Typical sources:

- **File path:** `import.meta.resolve('./worker.ts')`
- **Inline script:** `URL.createObjectURL(new Blob([code], { type: 'application/javascript' }))`

### `poolSize`

Number of workers in the pool. Default is **4**. Minimum is 1. Tasks are dispatched round-robin.

```typescript
worker: {
  scriptURL: workerScriptUrl,
  poolSize: 8
}
```

### `taskTimeoutMs`

Per-task timeout in milliseconds. Default is **5000**. A task that runs longer rejects with a timeout error, the slot is reclaimed, and the worker is respawned. The reclaim surfaces as a [`worker:timeout`](/middleware/observability/events#workers) event followed by [`worker:respawn`](/middleware/observability/events#workers).

```typescript
worker: {
  scriptURL: workerScriptUrl,
  taskTimeoutMs: 10_000
}
```

### `maxQueueDepth`

Maximum accepted-but-unsettled tasks the pool holds before turning new work away. Default is the worker count times **8**, so a pool of 4 holds up to 32. Once the ceiling is hit a new dispatch is refused immediately rather than queued, which keeps a flood of work from piling up without bound:

```typescript
worker: {
  scriptURL: workerScriptUrl,
  poolSize: 4,
  maxQueueDepth: 64
}
```

### `maxQueueWaitMs`

Maximum projected wait, measured as the chosen slot's pending count times `taskTimeoutMs`, before a dispatch is refused. Default is **2000**. A task that would otherwise sit behind a long backlog is turned away fast instead of waiting:

```typescript
worker: {
  scriptURL: workerScriptUrl,
  maxQueueWaitMs: 5_000
}
```

A refused dispatch rejects right away and surfaces as a [`worker:rejected`](/middleware/observability/events#workers) event, with `reason` saying whether `maxQueueDepth` or `maxQueueWaitMs` tripped it.

## Complete Example (Inline Worker)

Using an inline worker script with `Blob` and `createObjectURL`:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const workerCode = `
self.onmessage = (e) => {
  const data = e.data || {}
  const n = Math.max(0, Number(data.iterations) || 50000)
  let value = 0
  for (let i = 0; i < n; i++) value += Math.sqrt(i)
  self.postMessage({
    done: true,
    value
  })
}
export {}
`

const workerScriptUrl = URL.createObjectURL(
  new Blob(
    [workerCode],
    {
      type: 'application/javascript'
    }
  )
)

const router = new Router({
  routesDir: './routes',
  worker: {
    scriptURL: workerScriptUrl,
    poolSize: 4
  }
})

await router.serve(8000)
```

## Error Handling

- **No pool:** A router created without `worker` leaves `ctx.getState('worker' as never)` undefined. Return 503 or a clear message when the route requires a worker.
- **Worker error:** When the worker calls `postMessage({ error: true, message: '...' })`, `worker.run()` rejects with an `Error` carrying that message. Without a message, the error reads `Worker returned an error with no message`.
- **Worker crash:** When the worker throws or crashes, `run()` rejects with `Worker task failed before responding`, and the slot recovers on its own.
- **Task timeout:** When a task runs past `taskTimeoutMs` (default 5000), `run()` rejects with `Worker task exceeded <ms>ms timeout`.
- **Refused under load:** When the pool is at `maxQueueDepth` or the projected wait passes `maxQueueWaitMs`, `run()` rejects with a queue-full or slot-busy error before the task ever starts.

Every one of these faults also streams through the observability bus as a [worker event](/middleware/observability/events#workers), so a stall, crash, recovery, or refusal is visible without touching the request path. Catch a rejected task and forward it to the [centralized error handler](/error-handling/object-details):

```typescript
try {
  const result = await worker.run(payload)
  return ctx.send.json(result)
} catch (err) {
  // Route the failure through error handling
  return await ctx.handleError(500, err as Error)
}
```

## Structured Clone Only

Payload and result are sent via `postMessage` / `onmessage`, so only **structured-clone serializable** data is allowed, which covers plain objects, arrays, primitives, `Date`, `RegExp`, `Map`, `Set`, and similar values. Functions, symbols, and non-cloneable class instances cannot cross that boundary.
