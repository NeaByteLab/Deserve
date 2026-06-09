---
description: "Overview of Deserve observability: lifecycle events, logging, and error reporting."
---

# Observability Overview

Deserve emits lifecycle and error events through a built-in event bus. A single `router.on()` subscription receives every event, which keeps logging, metrics, and error reporting in one place instead of scattering `console.log` calls across handlers.

This middleware-style hook sits beside the router and watches everything that happens, from server startup to each finished request.

## Subscribing to Events

`router.on()` registers a listener and returns an unsubscribe function:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({ routesDir: './routes' })

// Receive every lifecycle and error event
const off = router.on((event) => {
  console.log(event.kind, event.metadata)
})

await router.serve(8000)

// Stop listening later
off()
```

The listener fires for all event kinds, so filtering happens inside the callback.

## Event Shape

Every event shares the same envelope:

```typescript
{
  type: 'internal' | 'external', // origin channel
  kind: string,                  // event name, such as 'request:complete'
  metadata: { ... },             // fields specific to the kind
  timestamp: number              // epoch milliseconds
}
```

- **`type`** - `external` for normal client traffic, `internal` for framework faults and timeouts. A request event is `internal` when a framework error or the synthetic 503 timeout produced it, otherwise `external`. Every other kind is always `internal`.
- **`kind`** - the discriminant used to tell events apart.
- **`metadata`** - readonly fields that depend on the kind.
- **`timestamp`** - when the event was created.

The full list of kinds and their metadata lives in [Event Reference](/middleware/observability/events).

## Difference From a Domain Event Bus

The observability bus reports framework activity such as requests, routes, views, and faults. A domain event bus carries application facts like `user:created`. They serve different jobs and often run side by side. See the [domain event bus pattern](/core-concepts/multi-service#event-bus) for sharing application events across services.

## Where to Go Next

- [Event Reference](/middleware/observability/events) - every event kind and its metadata.
- [Request Logging](/middleware/observability/logging) - turn events into a structured access log.
- [Error Reporting](/middleware/observability/errors) - record failures and pair with [error handling](/error-handling/object-details).
