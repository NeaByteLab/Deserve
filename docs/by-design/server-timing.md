---
description: "Why Deserve has no Server-Timing middleware, since the lifecycle already measures duration and the header is one line."
---

# Server-Timing

Deserve has no Server-Timing middleware. The duration it would report is already measured by the [lifecycle events](/middleware/observability/overview), and emitting the header is a single line when a route wants it.

## Why It Is Not Built In

The [`Server-Timing`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Server-Timing) header surfaces server-side metrics in browser DevTools, so a request shows how long a stage took. A middleware that adds it for every response makes two assumptions for the whole app at once, which metrics to expose and to whom.

Those metrics are a detail of a single handler, not a framework-wide policy. One route times a database call, another times a render, and a public endpoint may not want to reveal timing at all. So the decision is to leave the header to the route that knows what is worth measuring, and to keep the measurement where it already lives.

## The Duration Is Already Measured

Every `request:completed` event carries `durationMs`, the measured time for the whole request, alongside the `route` and `method`. For dashboards and logs that is the number to read, with no header and no per-route code. See [Request Logging](/middleware/observability/logging) for turning it into a log line.

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routes: { directory: './routes' }
})
// ---cut---
router.on((event) => {
  // Read the measured request duration
  if (event.kind === 'request:completed') {
    const { route, durationMs } = event.metadata as { route?: string, durationMs: number }
    console.log(`${route ?? 'unknown'} took ${Math.round(durationMs)}ms`)
  }
})

await router.serve(8000)
```

## Emitting the Header When Wanted

For a route that does want the metric in DevTools, the header is one [`ctx.set.header`](/core-concepts/context-object#ctx-set-header-key-value) call. Time the work, then write a `Server-Timing` entry with a name and the duration in milliseconds.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export async function GET(ctx: Context): Promise<Response> {
  // Time the work this route does
  const start = performance.now()
  const data = await loadData()
  const ms = (performance.now() - start).toFixed(1)

  // Expose it to DevTools per route
  ctx.set.header('Server-Timing', `db;dur=${ms}`)
  return ctx.send.json(data)
}

declare function loadData(): Promise<unknown>
```

The header names the stage that matters for this route, which is more useful than a blanket number the framework would have to guess at. For tracing a request across services instead of timing one stage, see [Distributed Tracing](/by-design/tracing).
