---
description: "Why Deserve ships no OpenTelemetry SDK, and how its OTel-aligned events feed any tracing backend."
---

# Distributed Tracing

Deserve carries no OpenTelemetry SDK, no automatic span creation, and no trace context propagation. That boundary is drawn on purpose.

## Why It Is Not Built In

A tracing SDK is a heavy, opinionated dependency. It pins exporter versions, owns the sampling policy, and decides how a span tree is shaped. Bundling one would break [zero dependency](/core-concepts/zero-dependency) and force a single vendor on every project, while every team already runs a different backend. One ships to [Grafana Tempo](https://grafana.com/oss/tempo/), another to [Jaeger](https://www.jaegertracing.io/), another to a hosted vendor, another to a homegrown collector.

So the decision is to stop at the data, not the transport. Deserve emits a complete request lifecycle through [observability events](/middleware/observability/overview), and each event already carries fields named after the OpenTelemetry semantic conventions. The event is the source of truth, and forwarding it to a tracing backend is a short subscription the developer owns.

## What Ships, and What Does Not

These three sit outside the framework on purpose:

- **Auto-instrumentation** - Deserve does not wrap libraries or open spans for outbound calls. Each request emits one finished event, and a span is built from it in the listener.
- **Trace context propagation** - no `traceparent` header is read or written. A handler that needs distributed context reads the header through [`ctx.header('traceparent')`](/core-concepts/context-object#request-data-access) and threads it onward.
- **Span hierarchy** - events are flat, one per request, not a parent-child tree. Nested spans are assembled in the backend, or in the listener, from data the events provide.

What does ship is the data a span needs, already collected and named to match.

## The Data Is Already There

Every request emits `request:complete`, and a request with status `400` or higher also emits `request:error`. Both carry the same envelope, and the metadata is the truth a span is built from:

- **`timestamp`** - event creation time in epoch milliseconds, the span start anchor.
- **`durationMs`** - measured request duration, the span length.
- **`ip`** - resolved client IP, honoring [`trustProxy`](/getting-started/server-configuration#client-ip-resolution).
- **`method`**, **`statusCode`**, **`url`** - the core request attributes.
- **OTel-aligned metrics** - `route`, `serverAddress`, `serverPort`, `userAgent`, `requestSize`, `responseSize`, forwarded only when known.

The field names follow the OpenTelemetry semantic conventions, so a map to span attributes is close to a rename. The full list lives in the [Event Reference](/middleware/observability/events#requests).

## Building a Span From an Event

This listener turns each finished request into a span-shaped record and hands it to an exporter. Swap the `exportSpan` call for any backend client.

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({ routesDir: './routes' })
declare function exportSpan(span: Record<string, unknown>): void
// ---cut---
router.on((event) => {
  // Build a span from each finished request
  if (event.kind === 'request:complete') {
    const m = event.metadata as {
      method: string
      url: string
      statusCode: number
      durationMs: number
      route?: string
      serverAddress?: string
      serverPort?: number
      userAgent?: string
    }
    exportSpan({
      name: `${m.method} ${m.route ?? m.url}`,
      startTimeUnixMs: event.timestamp,
      durationMs: m.durationMs,
      attributes: {
        'http.request.method': m.method,
        'http.response.status_code': m.statusCode,
        'url.full': m.url,
        'http.route': m.route,
        'server.address': m.serverAddress,
        'server.port': m.serverPort,
        'user_agent.original': m.userAgent
      }
    })
  }
})

await router.serve(8000)
```

The attribute keys above are the OpenTelemetry HTTP span names, so the record drops straight into a tracing pipeline.

## Continuing an Incoming Trace

Distributed tracing links spans across services through the `traceparent` header. Deserve does not parse it, so a handler that joins an existing trace reads the header from [Context](/core-concepts/context-object#request-data-access) and carries it forward.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export async function GET(ctx: Context): Promise<Response> {
  // Read upstream trace context when present
  const traceparent = ctx.header('traceparent')

  // Forward it on outbound calls
  const upstream = await fetch('https://api.internal/data', {
    headers: traceparent ? { traceparent } : {}
  })

  return ctx.send.json(await upstream.json())
}
```

The same `ctx.state` used for [sharing state](/core-concepts/context-object#sharing-state) holds a span ID across middleware and handler when one listener opens a span early and another closes it.

## Where the Data Goes

The listener is the only seam, so the destination is a choice, not a constraint. Grafana, Jaeger, a hosted vendor, or a self-built collector all receive the same span record. Pair this with [Request Logging](/middleware/observability/logging) for access logs and [Error Reporting](/middleware/observability/errors) for failures, all from the one [event bus](/middleware/observability/overview).
