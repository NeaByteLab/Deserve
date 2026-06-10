---
description: "Capture and report errors from Deserve using the observability event stream."
---

# Error Reporting

Errors surface on the same [`router.on()`](/middleware/observability/overview) bus, so reporting lives in one listener rather than spread across handlers.

## Reporting Failed Requests

`request:error` fires whenever a response status is `400` or higher, and carries the original error when one exists:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routesDir: './routes'
})

// Record every failed request
router.on((event) => {
  if (event.kind === 'request:error') {
    const { method, url, statusCode, error } = event.metadata as {
      method: string
      url: string
      statusCode: number
      error?: Error
    }
    console.error(`${method} ${url} ${statusCode}`, error?.message)
  }
})

await router.serve(8000)
```

## Capturing Process Faults

`process:error` fires for unhandled rejections, uncaught errors, and blocked termination attempts. A serving router keeps running and reports the fault instead of crashing:

![Unhandled rejections, uncaught errors, and blocked self-termination each become a process:error event carrying its origin and error, so the process keeps running with no downtime and the fault is captured in the same router.on listener instead of being lost to a crash](/diagrams/obs-process-fault.png)

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routesDir: './routes'
})
// ---cut---
router.on((event) => {
  if (event.kind === 'process:error') {
    const { origin, error } = event.metadata as { origin: string; error: Error }
    // origin tells the fault source
    console.error(`process fault [${origin}]`, error.message)
  }
})
```

## Capturing Subsystem Faults

The same listener catches faults from the worker pool and the built-in middleware. A task that times out, a worker that crashes, a dispatch refused under load, a session cookie that fails to decode, and a CSRF rule that throws each arrive as their own event. Filter on the kinds listed in the [Event Reference](/middleware/observability/events#workers) to route them wherever logs go:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routesDir: './routes'
})
// ---cut---
router.on((event) => {
  // React to worker and middleware faults
  if (event.kind === 'worker:crash' || event.kind === 'session:invalid') {
    console.error(event.kind, event.metadata)
  }
})
```

## Pairing With Error Handling

Two hooks cover different jobs:

- [`router.catch()`](/error-handling/object-details) shapes the response a client receives.
- `router.on()` records what happened for logs and metrics.

Use `catch` to control the reply, and `on` to observe it. A typical setup wires both:

![One failed request fans out to two independent hooks, where router.catch shapes the Response the client receives with a controlled status and body, and router.on records the same failure into logs and metrics without affecting the reply](/diagrams/obs-catch-vs-on.png)

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routesDir: './routes'
})
// ---cut---
// Shape the client response
router.catch((ctx, info) => {
  return ctx.send.json(
    {
      error: 'Something went wrong'
    },
    {
      status: info.statusCode
    }
  )
})

// Record the failure for later
router.on((event) => {
  if (event.kind === 'request:error') {
    const { url, error } = event.metadata as { url: string; error?: Error }
    console.error(url, error?.message)
  }
})
```

For the default response when no handler is set, see [Default Behavior](/error-handling/default-behavior).
