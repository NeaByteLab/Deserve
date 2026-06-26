---
description: "Performance characteristics and caching behavior of the Deserve template engine."
---

# Performance and Limits

The DVE engine caches compiled templates and guards each render with a set of limits, so large pages stay fast and a runaway template fails loudly instead of hanging the server. Every limit is configured under `views` on the [Router options](/getting-started/routes-configuration#views).

## Caching

A template is compiled once, then the parsed result is reused on every later render:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
declare const data: Record<string, unknown>
declare const newData: Record<string, unknown>
// ---cut---
// First render compiles and caches
await ctx.render('template', data)

// Later renders reuse the cache
await ctx.render('template', newData)
```

The cache covers compilation only, not data or backend logic. Editing the file clears its entry through [hot reload](/core-concepts/hot-reload), so the next render compiles the new source.

## Iteration Limit

Each <code v-pre>{{#each}}</code> block is capped at `100_000` iterations by default, which keeps one unbounded loop from starving the event loop. The engine checks the array length before emitting any item, so an oversized loop fails fast. Tune it with `views.maxIterations`:

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  views: {
    directory: './views',
    maxIterations: 200_000
  }
})
```

When a loop exceeds the cap, the engine throws and the server responds with **400 Bad Request**. For very large datasets, reach for [streaming rendering](/rendering/streaming). For CPU-heavy rendering, offload to a [worker pool](/recipes/worker-pool).

## Render Budget Limits

Two more caps guard the whole render rather than a single loop. `maxRenderIterations` sums every <code v-pre>{{#each}}</code> body execution across the page, including nested loops, and defaults to `1_000_000`. `maxOutputSize` caps the total characters one render may produce and defaults to `5_000_000`:

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  views: {
    directory: './views',
    maxRenderIterations: 500_000,
    maxOutputSize: 2_000_000
  }
})
```

Crossing either cap responds with **400 Bad Request**, the same status as the per-loop limit. Keep `maxRenderIterations` at or above `maxIterations`, otherwise a single large loop trips the total cap first.

## Template Size Limit

`maxTemplateSize` caps the characters of a single template source, checked at compile time, and defaults to `1_000_000`. The same cap applies to every included or layout file the engine resolves. An oversized source throws before parsing begins, which responds with **400 Bad Request**:

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  views: {
    directory: './views',
    maxTemplateSize: 500_000
  }
})
```

## Include Depth Limit

Template includes and layout chains share a cap of 64 levels of nesting, so a circular or runaway chain throws instead of looping forever. Crossing the cap responds with **400 Bad Request**. Keeping partials and layouts shallow stays well within this limit, which is covered alongside the [include](/rendering/syntax#includes) and [layout](/rendering/syntax#layouts) syntax.
