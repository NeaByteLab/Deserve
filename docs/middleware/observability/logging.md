---
description: "Turn Deserve request events into structured request logs."
---

# Request Logging

A single [`router.on()`](/middleware/observability/overview) subscription turns every finished request into a structured access log, with no logging code inside handlers.

![Every finished request emits request:complete with OpenTelemetry-aligned metrics, and a request with status 400 or higher also emits request:error carrying the original error, so one router.on listener fans the same envelope into an access log line, a slow request warning filtered by duration, and an error report](/diagrams/obs-request-lifecycle.png)

## Basic Access Log

Listen for `request:complete` and print one line per request:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({ routesDir: './routes' })

// One log line per finished request
router.on((event) => {
  if (event.kind === 'request:complete') {
    const { method, url, statusCode, durationMs } = event.metadata as {
      method: string
      url: string
      statusCode: number
      durationMs: number
    }
    console.log(`${method} ${url} ${statusCode} ${Math.round(durationMs)}ms`)
  }
})

await router.serve(8000)
```

## Structured JSON Logs

Emit JSON when a log pipeline expects structured records:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({ routesDir: './routes' })
// ---cut---
router.on((event) => {
  if (event.kind === 'request:complete') {
    // Forward the full metadata as JSON
    console.log(JSON.stringify({
      at: event.timestamp,
      ...event.metadata
    }))
  }
})
```

The metadata already includes OpenTelemetry-aligned fields like `route`, `serverAddress`, `userAgent`, and `requestSize`. See the [Event Reference](/middleware/observability/events#requests) for the full list.

## Logging Slow Requests

Filter by duration to surface only slow traffic:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({ routesDir: './routes' })
// ---cut---
router.on((event) => {
  // Flag requests slower than 500ms
  if (event.kind === 'request:complete') {
    const { url, durationMs } = event.metadata as { url: string; durationMs: number }
    if (durationMs > 500) {
      console.warn(`SLOW ${url} ${Math.round(durationMs)}ms`)
    }
  }
})
```

For failures, see [Error Reporting](/middleware/observability/errors).
