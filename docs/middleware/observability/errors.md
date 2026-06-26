---
description: "Capture and report errors from Deserve using the observability event stream."
---

# Error Reporting

Errors surface on the same [`router.on()`](/middleware/observability/overview) bus, so reporting lives in one listener rather than spread across handlers.

## Reporting Failed Requests

`request:failed` fires whenever a response status is `400` or higher, and carries the original error when one exists:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routes: { directory: './routes' }
})

// Record every failed request
router.on((event) => {
  if (event.kind === 'request:failed') {
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

`process:failed` fires for unhandled rejections, uncaught errors, and blocked termination attempts. A serving router keeps running and reports the fault instead of crashing:

![Unhandled rejections, uncaught errors, and blocked self-termination each become a process:failed event carrying its origin and error, so the process keeps running with no downtime and the fault is captured in the same router.on listener instead of being lost to a crash](/diagrams/obs-process-fault.png)

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routes: { directory: './routes' }
})
// ---cut---
router.on((event) => {
  if (event.kind === 'process:failed') {
    const { origin, error } = event.metadata as { origin: string; error: Error }
    // origin tells the fault source
    console.error(`process fault [${origin}]`, error.message)
  }
})
```

## Capturing Subsystem Faults

The same listener catches faults from the worker pool and the built-in middleware. A task that times out, a worker that crashes, a dispatch refused under load, a session cookie that fails to decode, and a CSRF rule that throws each arrive as their own event. Filter on the kinds listed under [Workers](/middleware/observability/events#workers) and [Security Middleware](/middleware/observability/events#security-middleware) to route them wherever logs go:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routes: { directory: './routes' }
})
// ---cut---
router.on((event) => {
  // React to worker and middleware faults
  if (event.kind === 'worker:crashed' || event.kind === 'session:invalid') {
    console.error(event.kind, event.metadata)
  }
})
```

## Pairing With Error Handling

Shaping a response and recording a failure are separate jobs. [`router.catch()`](/error-handling/object-details) controls what the client sees, while `router.on()` records what happened for logs and metrics. The two run independently, and wiring both is covered in [Defense in Depth](/error-handling/defense-in-depth#recording-across-layers).
