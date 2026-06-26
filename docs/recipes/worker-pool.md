---
description: "Offloading CPU-bound work to a pool of Deno workers via the Deserve worker pool API."
---

# Worker Pool

> **Reference**: [Deno Workers API](https://docs.deno.com/runtime/manual/workers/)

A CPU-bound task like heavy math, parsing, or compression blocks the event loop while it runs, so every other request waits behind it. The worker pool moves that work onto a pool of [Deno Workers](https://docs.deno.com/runtime/manual/workers/) running off the main thread, so the server keeps answering while the computation happens elsewhere. I/O-bound work like a file read or a network call already yields the loop, so it stays on the main thread where it belongs.

Once a pool is configured on the router, a route reaches it through [`ctx.get.worker()`](/core-concepts/context-object#ctx-get-worker) and hands off a task with `run(payload)`.

## Configuring the Pool

The pool turns on through the `worker` option, which needs a **script URL** that resolves to a module. An `import.meta.resolve()` call points at a file on disk, while `URL.createObjectURL()` wraps inline code:

```typescript twoslash
import { Router } from '@neabyte/deserve'

// Resolve worker script as a module
const workerScriptUrl = import.meta.resolve('./worker.ts')

// Enable the pool on the router
const router = new Router({
  routes: { directory: './routes' },
  worker: {
    scriptURL: workerScriptUrl,
    poolSize: 4
  }
})

await router.serve(8000)
```

## Writing the Worker Script

The worker script listens for `message` and replies with `postMessage`. The payload and result both cross the thread boundary through structured clone, so only serializable data passes, which rules out functions and symbols:

```typescript
// worker.ts
self.onmessage = (e: MessageEvent) => {
  const data = e.data as { iterations?: number }
  const n = Math.max(0, Number(data?.iterations) || 50_000)
  let value = 0
  for (let i = 0; i < n; i++) {
    value += Math.sqrt(i)
  }
  // Reply with the computed result
  self.postMessage({
    done: true,
    value
  })
}
```

A worker reports a failure by sending an object with `error: true` and an optional `message`, which surfaces back on the calling side as a rejected `run()`:

```typescript
// Report a failure to the caller
self.postMessage({
  error: true,
  message: 'Computation failed'
})
```

## Dispatching From a Route

The worker controller lives on `ctx.get.worker()`. A router created without a `worker` option leaves the controller unset, so `ctx.get.worker()` throws `NotSupported` the moment a route reaches for it. Wrapping the dispatch in a try lets the [centralized error handler](/error-handling/object-details) shape the reply, where `NotSupported` maps to a **501** on its own:

```typescript twoslash
// routes/heavy.ts
import type { Context } from '@neabyte/deserve'

export async function GET(ctx: Context): Promise<Response> {
  try {
    // Throws when no pool configured
    const worker = ctx.get.worker()
    // Dispatch task to worker pool
    const result = await worker.run<{ done: boolean; value: number }>({
      iterations: 50_000
    })
    return ctx.send.json({
      value: result?.value
    })
  } catch (error) {
    // Route the failure through error handling
    return await ctx.handleError(500, error as Error)
  }
}
```

A task is dispatched round-robin across the pool, so back-to-back requests spread over the available workers rather than queuing on one.

## Tuning the Pool

### `scriptURL`

The worker script URL, the one required field. It must point to a module, since Deno runs workers with `type: 'module'`. Two sources cover most cases:

- **File path:** `import.meta.resolve('./worker.ts')`
- **Inline script:** `URL.createObjectURL(new Blob([code], { type: 'application/javascript' }))`

### `poolSize`

The number of workers in the pool, defaulting to **4** with a floor of 1. A task spreads round-robin across these workers, so a larger pool absorbs more parallel work at the cost of more memory:

```typescript
worker: {
  scriptURL: workerScriptUrl,
  poolSize: 8
}
```

### `taskTimeoutMs`

The per-task deadline in milliseconds, defaulting to **5000**. A task that runs past it rejects with a timeout error, the slot is reclaimed, and the worker is respawned. The reclaim surfaces as a [`worker:timeout`](/middleware/observability/events#workers) event followed by [`worker:respawned`](/middleware/observability/events#workers):

```typescript
worker: {
  scriptURL: workerScriptUrl,
  taskTimeoutMs: 10_000
}
```

### `maxQueueDepth`

The ceiling on accepted-but-unsettled tasks the pool holds before turning new work away, defaulting to the worker count times **8**, so a pool of 4 holds up to 32. Once the ceiling is hit a new dispatch is refused right away rather than queued, which keeps a flood of work from piling up without bound:

```typescript
worker: {
  scriptURL: workerScriptUrl,
  poolSize: 4,
  maxQueueDepth: 64
}
```

### `maxQueueWaitMs`

The cap on projected wait, measured as the chosen slot's pending count times `taskTimeoutMs`, before a dispatch is refused. The default is **2000**. A task that would otherwise sit behind a long backlog is turned away fast instead of waiting:

```typescript
worker: {
  scriptURL: workerScriptUrl,
  maxQueueWaitMs: 5_000
}
```

A refused dispatch rejects right away and surfaces as a [`worker:rejected`](/middleware/observability/events#workers) event, with `reason` reading `queue-depth` when `maxQueueDepth` tripped it or `queue-wait` when `maxQueueWaitMs` did.

## Inline Worker Script

A separate `worker.ts` file is the clearest layout, but small compute fits inline. Wrapping the source in a `Blob` and handing it to `URL.createObjectURL()` produces a module URL the pool accepts, which keeps a one-off worker in the same file as the router:

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
    { type: 'application/javascript' }
  )
)

const router = new Router({
  routes: { directory: './routes' },
  worker: {
    scriptURL: workerScriptUrl,
    poolSize: 4
  }
})

await router.serve(8000)
```

## How Failures Surface

A dispatch can fail in a handful of ways, and each one rejects `run()` with a specific error so the cause stays readable:

- **No pool:** A router created without `worker` leaves `ctx.get.worker()` throwing `NotSupported`, which the [centralized error handler](/error-handling/object-details) maps to a **501**. Wrap the call in a try when the route should reply with a clearer message.
- **Worker error:** When the worker calls `postMessage({ error: true, message: '...' })`, `worker.run()` rejects with an `Error` carrying that message. Without a message, the error reads `Worker returned an error with no message`.
- **Worker crash:** When the worker throws or crashes, `run()` rejects with `Worker task failed before responding`, and the slot recovers on its own.
- **Task timeout:** When a task runs past `taskTimeoutMs` (default 5000), `run()` rejects with `Worker task exceeded <ms>ms timeout`.
- **Refused under load:** When the pool is at `maxQueueDepth` or the projected wait passes `maxQueueWaitMs`, `run()` rejects with a queue-full or slot-busy error before the task ever starts.

Every one of these faults also streams through the observability bus as a [worker event](/middleware/observability/events#workers), so a stall, crash, recovery, or refusal stays visible without touching the request path. Catching a rejected task and forwarding it to the [centralized error handler](/error-handling/object-details) keeps the response shaping in one place:

```typescript
try {
  // Dispatch task to worker pool
  const result = await worker.run(payload)
  return ctx.send.json(result)
} catch (err) {
  // Route the failure through error handling
  return await ctx.handleError(500, err as Error)
}
```

## Structured Clone Only

Payload and result are sent via `postMessage` / `onmessage`, so only **structured-clone serializable** data is allowed, which covers plain objects, arrays, primitives, `Date`, `RegExp`, `Map`, `Set`, and similar values. Functions, symbols, and non-cloneable class instances cannot cross that boundary. See the [structured clone algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm) on MDN for the full list.
