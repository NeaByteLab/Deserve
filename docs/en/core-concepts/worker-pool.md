# Worker Pool

> **Unreleased** — This feature is not yet in a stable release.

> **Reference**: [Deno Workers API](https://docs.deno.com/runtime/manual/workers/)

The worker pool offloads CPU-bound work to a pool of Deno Workers so the main thread stays responsive. When you configure a worker pool, `ctx.state.worker` is available in route handlers and you can run tasks with `worker.run(payload)`.

## When to Use

Use the worker pool when a route does **CPU-bound work** (e.g. heavy math, parsing, compression) that would block the event loop. For I/O-bound work (file, network), the main thread is usually enough.

## Basic Usage

### 1. Configure Router with Worker

Pass `worker` when creating the router. You must provide a **script URL** that resolves to a module (e.g. via `import.meta.resolve()` or `URL.createObjectURL()` for inline code):

```typescript
// 1. Import Router
import { Router } from '@neabyte/deserve'

// 2. Resolve worker script URL (must be a module)
const workerScriptUrl = import.meta.resolve('./worker.ts')

// 3. Create router with worker pool
const router = new Router({
  routesDir: './routes',
  worker: { scriptURL: workerScriptUrl, poolSize: 4 }
})

// 4. Start server
await router.serve(8000)
```

### 2. Implement the Worker Script

The worker script must listen for `message` and reply with `postMessage`. Payload and result must be **structured-clone serializable** (no functions or symbols):

```typescript
// worker.ts
self.onmessage = (e: MessageEvent) => {
  const data = e.data as { iterations?: number }
  const n = Math.max(0, Number(data?.iterations) ?? 50_000)
  let value = 0
  for (let i = 0; i < n; i++) value += Math.sqrt(i)
  self.postMessage({ done: true, value })
}
```

To report an error from the worker, send an object with `error: true` and optional `message`:

```typescript
self.postMessage({ error: true, message: 'Computation failed' })
```

### 3. Use in a Route

Read `ctx.state.worker` and call `run(payload)`. If the router was created without `worker`, `ctx.state.worker` is undefined and you should return 503 or handle accordingly:

```typescript
// routes/heavy.ts
import type { Context } from '@neabyte/deserve'

export async function GET(ctx: Context) {
  const worker = ctx.state['worker'] as { run: <T>(p: unknown) => Promise<T> } | undefined
  if (!worker?.run) {
    return ctx.send.json({ error: 'Worker not enabled' }, { status: 503 })
  }
  const result = await worker.run<{ done: boolean; value: number }>({ iterations: 50_000 })
  return ctx.send.json({ value: result?.value })
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
worker: { scriptURL: workerScriptUrl, poolSize: 8 }
```

## Complete Example (Inline Worker)

Using an inline worker script with `Blob` and `createObjectURL`:

```typescript
import { Router } from '@neabyte/deserve'

const workerCode = `
self.onmessage = (e) => {
  const data = e.data || {}
  const n = Math.max(0, Number(data.iterations) || 50000)
  let value = 0
  for (let i = 0; i < n; i++) value += Math.sqrt(i)
  self.postMessage({ done: true, value })
}
export {}
`

const workerScriptUrl = URL.createObjectURL(
  new Blob([workerCode], { type: 'application/javascript' })
)

const router = new Router({
  routesDir: './routes',
  worker: { scriptURL: workerScriptUrl, poolSize: 4 }
})

await router.serve(8000)
```

## Error Handling

- **No pool:** If the router was created without `worker`, `ctx.state.worker` is undefined. Return 503 or a clear message when the route requires a worker.
- **Worker error:** If the worker calls `postMessage({ error: true, message: '...' })`, `worker.run()` rejects with an `Error` with that message.
- **Worker crash:** If the worker throws or crashes, `run()` rejects with a generic worker error.

Handle errors in the route:

```typescript
try {
  const result = await worker.run(payload)
  return ctx.send.json(result)
} catch (err) {
  return ctx.handleError(500, err as Error)
}
```

## Structured Clone Only

Payload and result are sent via `postMessage` / `onmessage`. Only **structured-clone serializable** data is allowed: plain objects, arrays, primitives, `Date`, `RegExp`, `Map`, `Set`, etc. You cannot pass functions, symbols, or non-cloneable class instances.
