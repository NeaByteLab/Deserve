---
description: 'Stop a Deserve server cleanly on SIGINT or SIGTERM, drain in-flight requests, and run shutdown work with an AbortSignal.'
---

# Graceful Shutdown

A graceful shutdown stops a server from accepting new connections while letting the requests already in flight finish, so a deploy or a container restart never cuts a response in half. Deserve handles this out of the box, and an [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) opens the door to triggering it from code.

## Built-In Signal Handling

A plain `router.serve()` already listens for the signals a process manager sends on stop. On `SIGHUP`, `SIGINT` (a `Ctrl+C` in the terminal), or `SIGTERM` (what Docker and most orchestrators send), the server stops taking new requests, drains the ones still running, then resolves the `serve()` promise:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routes: { directory: './routes' }
})

// Resolves once the drain completes
await router.serve(8000)

// Reached only after a clean shutdown
console.log('Server stopped')
```

Windows swaps that set for `SIGBREAK` and `SIGINT`, since the POSIX signals are not delivered there. No setup is needed for this path, so a containerized server already exits cleanly on `docker stop`. Each received signal also emits a [`process:failed`](/middleware/observability/events#process) event with `origin: 'process:signal'` right before the drain begins, so the stop reason lands on the same bus as every other fault.

## Triggering Shutdown From Code

Passing an `AbortSignal` as the third argument hands the trigger to the application, which fits a test that needs to stop the server or an admin route that ends the process. Aborting the controller drains the server the same way a signal does:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routes: { directory: './routes' }
})
// ---cut---
const controller = new AbortController()

// Stop the server after thirty seconds
setTimeout(() => controller.abort(), 30_000)

// Abort drains, then serve resolves
await router.serve(8000, '0.0.0.0', controller.signal)
```

An `AbortSignal` runs alongside the built-in listeners rather than replacing them, so a `SIGTERM` from the host and an `abort()` from code both reach the same drain. Whichever fires first stops the server, and the other becomes a no-op once the drain is underway. Wiring a signal listener to call `controller.abort()` is a way to fold both triggers into one path when that is the goal.

## Running Work on Shutdown

Cleanup like closing a database pool or flushing a buffer belongs after the drain, not inside it. The [`server:stopped`](/middleware/observability/events#server) event fires once the server stops draining, so a single [observability](/middleware/observability/overview) listener keeps shutdown work in one place:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routes: { directory: './routes' }
})
// ---cut---
router.on((event) => {
  // Runs after the drain completes
  if (event.kind === 'server:stopped') {
    console.log('Closing resources')
  }
})

await router.serve(8000)
```

The matching [`server:started`](/middleware/observability/events#server) event fires when the server binds, so startup and shutdown hooks live side by side on the same bus.

## What Drain Means for a Request

A request that is mid-flight when the drain starts runs to completion, and its response still ships. A connection that arrives after the drain begins is refused, since the listener has already stopped accepting. Long-lived responses are the one thing to watch, because an open [stream](/recipes/streaming-data) or [WebSocket](/middleware/websocket) holds the drain until it closes. Capping how long a single request may run with [`timeoutMs`](/getting-started/routes-configuration#timeoutms) keeps the drain from waiting forever on a slow handler.
