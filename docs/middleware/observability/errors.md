---
description: "Capture and report errors from Deserve using the observability event stream."
---

# Error Reporting

Errors surface on the same [`router.on()`](/middleware/observability/overview) bus, so reporting lives in one listener rather than spread across handlers.

## Reporting Failed Requests

`request:error` fires whenever a response status is `400` or higher, and carries the original error when one exists:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({ routesDir: './routes' })

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

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({ routesDir: './routes' })
// ---cut---
router.on((event) => {
  if (event.kind === 'process:error') {
    const { origin, error } = event.metadata as { origin: string; error: Error }
    // origin tells the fault source
    console.error(`process fault [${origin}]`, error.message)
  }
})
```

## Pairing With Error Handling

Two hooks cover different jobs:

- [`router.catch()`](/error-handling/object-details) shapes the response a client receives.
- `router.on()` records what happened for logs and metrics.

Use `catch` to control the reply, and `on` to observe it. A typical setup wires both:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({ routesDir: './routes' })
// ---cut---
// Shape the client response
router.catch((ctx, info) => {
  return ctx.send.json({ error: 'Something went wrong' }, { status: info.statusCode })
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
