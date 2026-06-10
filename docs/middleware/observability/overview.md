---
description: "Overview of Deserve observability: lifecycle events, logging, and error reporting."
---

# Observability Overview

Deserve emits lifecycle and error events through a built-in event bus. A single `router.on()` subscription receives every event, which keeps logging, metrics, and error reporting in one place instead of scattering `console.log` calls across handlers.

This middleware-style hook sits beside the router and watches everything that happens, from server startup to each finished request.

![Server, route, view, request, and process signals all funnel into a single event bus that fans every event to one router.on listener, where you filter by event kind, and the emit is a no-op while no listener is registered](/diagrams/obs-single-bus.png)

## Subscribing to Events

`router.on()` registers a listener and returns an unsubscribe function:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routesDir: './routes'
})

// Receive every lifecycle and error event
const off = router.on((event) => {
  console.log(event.kind, event.metadata)
})

await router.serve(8000)

// Stop listening later
off()
```

The listener fires for all event kinds, so filtering happens inside the callback. With no listener registered, emitting is a no-op and costs nothing, so the bus stays free until something subscribes.

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

- **`type`** - `external` for normal client traffic, `internal` for framework faults. A request event is `internal` when a framework error, the synthetic 503 timeout, or a missing request context produced it, otherwise `external`. Every other kind is always `internal`.
- **`kind`** - the discriminant used to tell events apart.
- **`metadata`** - readonly fields that depend on the kind.
- **`timestamp`** - when the event was created.

The full list of kinds and their metadata lives in [Event Reference](/middleware/observability/events).

## Difference From a Domain Event Bus

The observability bus reports framework activity such as requests, routes, views, and faults. A domain event bus carries application facts like `user:created`. They serve different jobs and often run side by side. See the [domain event bus pattern](/core-concepts/multi-service#event-bus) for sharing application events across services.

## A Built-In Audit Trail

Every subsystem reports on the same bus, from [server](/middleware/observability/events#server) and [route](/middleware/observability/events#routes) signals to [worker](/middleware/observability/events#workers), [middleware](/middleware/observability/events#middleware), and [process](/middleware/observability/events#process) faults. Each one arrives as the same `{ type, kind, metadata, timestamp }` envelope, structured and stamped at the instant it fires. A plain listener becomes an audit trail that records itself as the server runs, with no extra wiring.

That covers what compliance and security work usually ask for, and each control maps to a behaviour the bus already provides:

- **[SOC 2](https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-2) (CC7 monitoring)** wants security-relevant events captured. Tampered cookies (`session:invalid`), blocked termination calls (`process:error`), and failed CSRF rules (`csrf:rule-error`) all emit on their own.
- **[ISO/IEC 27001](https://www.iso.org/standard/27001) (A.8.15 logging)** wants an event log that holds up over time. Every event carries a `timestamp` in epoch milliseconds and arrives in order, so a timeline reconstructs cleanly.
- **[PCI DSS](https://www.pcisecuritystandards.org/document_library/) (Requirement 10 audit trails)** wants each action tied to its source. `request:complete` reports `method`, `url`, `statusCode`, `durationMs`, and an optional `ip` when the address is known.
- **[SIEM](https://csrc.nist.gov/glossary/term/security_information_and_event_management) and real-time alerting** want a feed to ingest. A single `router.on()` forwards the whole surface to wherever logs or alerts go.

The `type` field keeps the fault channel clean. Normal client traffic is `external`, while a framework error, the synthetic 503 timeout, or a missing request context marks the event `internal`. A fault alert pipeline filters on `internal` and never drowns in routine requests.

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routesDir: './routes'
})
// ---cut---
router.on((event) => {
  // Forward framework faults only
  if (event.type === 'internal') {
    console.log(JSON.stringify({ at: event.timestamp, ...event }))
  }
})
```

## Where to Go Next

- [Event Reference](/middleware/observability/events) - every event kind and its metadata.
- [Request Logging](/middleware/observability/logging) - turn events into a structured access log.
- [Error Reporting](/middleware/observability/errors) - record failures and pair with [error handling](/error-handling/object-details).
