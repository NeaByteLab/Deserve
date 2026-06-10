---
description: "Performance characteristics and caching behavior of the Deserve template engine."
---

# Performance and Limits

The DVE engine caches compiled templates and guards rendering with two limits, so large pages stay fast and a runaway template fails loudly instead of hanging the server.

## Caching

Templates are compiled once, then the parsed AST is reused on every later render:

```typescript twoslash
import type { Context, DataRecord } from '@neabyte/deserve'
declare const ctx: Context
declare const data: DataRecord
declare const newData: DataRecord
// ---cut---
// First render compiles and caches AST
await ctx.render('template', data)

// Later renders reuse cached AST
await ctx.render('template', newData)
```

The cache covers template compilation only, not data or backend logic. A change to the file clears its cache entry through [hot reload](/core-concepts/hot-reload).

## Iteration Limit

Each <code v-pre>{{#each}}</code> block is capped at `100_000` iterations by default, which prevents event loop starvation from one unbounded loop. Tune it with `maxIterations`:

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  viewsDir: './views',
  maxIterations: 200_000
})
```

When a loop exceeds the limit, the engine throws and the server responds with **400 Bad Request**. For very large datasets, reach for [streaming rendering](/rendering/streaming). For CPU-heavy rendering, offload to a [worker pool](/core-concepts/worker-pool).

## Render Budget Limits

Two more caps guard the whole render, not just one loop. `maxRenderIterations` sums every <code v-pre>{{#each}}</code> body execution across the page, including nested loops, and defaults to `1_000_000`. `maxOutputSize` caps the total characters a render may produce and defaults to `5_000_000`:

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  viewsDir: './views',
  maxRenderIterations: 500_000,
  maxOutputSize: 2_000_000
})
```

Crossing either cap responds with **400 Bad Request**, the same status as the per-loop limit. All three are set on the [Router options](/getting-started/routes-configuration#configuration-options).

## Include Depth Limit

Template includes are capped at 64 levels of nesting, so a circular or runaway include chain throws an error instead of looping forever. Crossing the cap responds with **400 Bad Request**. Keeping partials shallow stays well within this limit.
