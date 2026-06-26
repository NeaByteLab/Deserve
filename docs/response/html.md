---
description: "Send HTML responses with ctx.send.html()."
---

# HTML Responses

The `ctx.send.html()` method creates HTML responses. It sets `Content-Type: text/html; charset=utf-8` automatically.

## Basic Usage

```typescript twoslash
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  // Sends text/html by default
  const html = '<html><body><h1>Hello World</h1></body></html>'
  return ctx.send.html(html)
}
```

## Dynamic HTML

A template literal builds markup at runtime:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Build markup with a template literal
  const html = `
    <!DOCTYPE html>
    <html>
      <head><title>Welcome</title></head>
      <body>
        <h1>Hello from Deserve!</h1>
        <p>Server is running</p>
      </body>
    </html>
  `
  return ctx.send.html(html)
}
```

For larger pages, render a [DVE template](/rendering/) with `ctx.render()` instead of building HTML by hand.

## With Status Codes

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Not Found page with status 404
  const html = '<html><body><h1>Not Found</h1></body></html>'
  return ctx.send.html(html, { status: 404 })
}
```

## With Custom Headers

Headers set through `ctx.set.header()` merge into the response:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Set a header before sending
  ctx.set.header('X-Frame-Options', 'DENY')
  return ctx.send.html('<html><body>Content</body></html>')
}
```

## Method Signature

```typescript
ctx.send.html(html: string, options?: SendInit): Response
```

- **html** - HTML string response body
- **options** - optional `status` and `headers`
