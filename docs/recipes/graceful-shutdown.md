---
description: 'Stop a Deserve server cleanly on SIGINT or SIGTERM, drain in-flight requests, and run shutdown work with an AbortSignal.'
---

# Graceful Shutdown

A graceful shutdown stops a server from accepting new connections while letting the requests already in flight finish, so a deploy or a container restart never cuts a response in half. Deserve handles this out of the box, and an [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) opens the door to triggering it from code.

## Built-In Signal Handling

A plain `router.serve()` already listens for the signals a process manager sends on stop. On `SIGINT` (a `Ctrl+C` in the terminal) or `SIGTERM` (what Docker and most orchestrators send), the server stops taking new requests, drains the ones still running, then resolves the `serve()` promise:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routesDir: './routes'
})

// Resolves once the drain completes
await router.serve(8000)

// Reached only after a clean shutdown
console.log('Server stopped')
```

Windows listens for `SIGINT` only, since `SIGTERM` is not delivered there. No setup is needed for this path, so a containerized server already exits cleanly on `docker stop`.

## Triggering Shutdown From Code

Passing an `AbortSignal` as the third argument hands the trigger to the application, which fits a test that needs to stop the server or an admin route that ends the process. Aborting the controller drains the server the same way a signal does:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routesDir: './routes'
})
// ---cut---
const controller = new AbortController()

// Stop the server after thirty seconds
setTimeout(() => controller.abort(), 30_000)

// Abort drains, then serve resolves
await router.serve(8000, '0.0.0.0', controller.signal)
```

Handing over an `AbortSignal` takes over the stop trigger, so the built-in `SIGINT` and `SIGTERM` listeners stay off and the controller becomes the single way to stop. Wiring both is a matter of aborting the controller from inside a signal listener when that is the goal.

## Running Work on Shutdown

Cleanup like closing a database pool or flushing a buffer belongs after the drain, not inside it. The [`server:shutdown`](/middleware/observability/events#server) event fires once the server stops draining, so a single [observability](/middleware/observability/overview) listener keeps shutdown work in one place:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routesDir: './routes'
})
// ---cut---
router.on((event) => {
  // Runs after the drain completes
  if (event.kind === 'server:shutdown') {
    console.log('Closing resources')
  }
})

await router.serve(8000)
```

The matching [`server:listening`](/middleware/observability/events#server) event fires when the server binds, so startup and shutdown hooks live side by side on the same bus.

## What Drain Means for a Request

A request that is mid-flight when the drain starts runs to completion, and its response still ships. A connection that arrives after the drain begins is refused, since the listener has already stopped accepting. Long-lived responses are the one thing to watch, because an open [stream](/recipes/streaming-data) or [WebSocket](/middleware/websocket) holds the drain until it closes. Capping how long a single request may run with [`requestTimeoutMs`](/getting-started/routes-configuration#requesttimeoutms) keeps the drain from waiting forever on a slow handler.
