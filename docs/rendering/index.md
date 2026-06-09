---
description: "Server-side template rendering in Deserve using the built-in DVE view engine."
---

# Rendering Overview

> See [DVE syntax highlighting](https://github.com/NeaByteLab/Deserve/tree/main/editor) documentation.

Deserve ships a built-in template engine called DVE (Deserve View Engine) for building dynamic HTML from plain templates with a small <code v-pre>{{ }}</code> syntax.

## Setup

Point `viewsDir` at the templates folder when creating the router:

```typescript twoslash
import { Router } from '@neabyte/deserve'

// Point viewsDir at the templates folder
const router = new Router({
  viewsDir: './views'
})

await router.serve(8000)
```

## First Template

Create a `.dve` file inside the views folder:

```html
<!-- views/welcome.dve -->
<!DOCTYPE html>
<html>
  <head>
    <title>{{title}}</title>
  </head>
  <body>
    <h1>Hello {{name}}!</h1>
    <p>Today: {{date}}</p>
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

The `.dve` extension is optional in the path, so `'welcome'` and `'welcome.dve'` both resolve to the same file.

## Error Handling

A missing template throws `Template "<name>" not found in views directory`, and a render fault throws too. Let either reach the [centralized error handler](/error-handling/object-details), or catch it in the handler for a precise reply:

```typescript twoslash
import type { Context, DataRecord } from '@neabyte/deserve'
declare const data: DataRecord
// ---cut---
export async function GET(ctx: Context): Promise<Response> {
  try {
    return await ctx.render('template', data)
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes('not found in views directory')) {
      return ctx.send.json({ error: 'Template missing' }, { status: 404 })
    }
    return ctx.send.json({ error: 'Render failed' }, { status: 500 })
  }
}
```

## Where to Go Next

- [Template Syntax](/rendering/syntax) - variables, conditionals, loops, includes, and expressions.
- [Performance and Limits](/rendering/performance) - caching, the iteration limit, and the include depth limit.
- [Streaming Rendering](/rendering/streaming) - send HTML chunk by chunk for large pages.
