---
description: "Server-side template rendering in Deserve using the built-in DVE view engine."
---

# Rendering Overview

Deserve ships with a built-in template engine called DVE (Deserve View Engine). It turns plain HTML templates into finished pages by filling a small <code v-pre>{{ }}</code> syntax with route data. DVE lives in its own package, so the same engine works outside Deserve too. The full reference sits on [JSR](https://jsr.io/@neabyte/dve) and [npm](https://www.npmjs.com/package/@neabyte/dve), with the source on [GitHub](https://github.com/NeaByteLab/DVE).

## Setup

The view engine activates the moment `views.directory` points at a templates folder. With it omitted, `ctx.render()` throws `Deno.errors.NotSupported` because no engine is configured:

```typescript twoslash
import { Router } from '@neabyte/deserve'

// Point views.directory at the templates folder
const router = new Router({
  views: {
    directory: './views'
  }
})

await router.serve(8000)
```

The render limits also live under `views`, covered in [Performance and Limits](/rendering/performance) and [Routes Configuration](/getting-started/routes-configuration#views).

## First Template

Create a `.dve` file inside the views folder:

```html
<!-- views/welcome.dve -->
<!DOCTYPE html>
<html>
  <head>
    <title>{{ title }}</title>
  </head>
  <body>
    <h1>Hello {{ name }}!</h1>
    <p>Today: {{ date }}</p>
  </body>
</html>
```

Then render it from a route with `ctx.render()`:

```typescript twoslash
// routes/welcome.ts
import type { Context } from '@neabyte/deserve'

export async function GET(ctx: Context): Promise<Response> {
  // Render template with data
  return await ctx.render('welcome', {
    title: 'Welcome Page',
    name: 'John Doe',
    date: new Date().toLocaleDateString()
  })
}
```

The `.dve` extension is optional in the path, so `'welcome'` and `'welcome.dve'` both resolve to the same file. The lookup also strips a leading slash and normalizes backslashes, so a Windows-style path still finds the template.

## Caching and Reload

The first render of a template compiles it and caches the parsed result, and every later render reuses that cache. Editing a `.dve` file clears its entry through [hot reload](/core-concepts/hot-reload), so the next render picks up the change with no restart. The numbers behind this live in [Performance and Limits](/rendering/performance#caching).

## Error Handling

A missing template file throws `Deno.errors.NotFound`, and a compile or render fault throws as well. Both reach the [centralized error handler](/error-handling/object-details) set with `router.catch()`, which shapes a single reply for the whole app instead of a try/catch in every route. A missing file maps to **404 Not Found**, and a compile or render fault maps to **400 Bad Request**.

When one route needs a precise reply, catch the throw and branch on the error type:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const data: Record<string, unknown>
// ---cut---
export async function GET(ctx: Context): Promise<Response> {
  try {
    return await ctx.render('template', data)
  } catch (error) {
    // Missing file throws NotFound
    if (error instanceof Deno.errors.NotFound) {
      return ctx.send.json({ error: 'Template missing' }, { status: 404 })
    }
    return ctx.send.json({ error: 'Render failed' }, { status: 500 })
  }
}
```

A render fault also surfaces on the [observability bus](/middleware/observability/overview) as a [`view:failed`](/middleware/observability/events#views) event, so logging stays in one place while the error handler shapes the response.

## Where to Go Next

- [Template Syntax](/rendering/syntax) - variables, conditionals, loops, includes, layouts, and expressions.
- [Performance and Limits](/rendering/performance) - caching, iteration caps, the output cap, and include depth.
- [Streaming Rendering](/rendering/streaming) - send HTML chunk by chunk for large pages.
