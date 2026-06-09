---
description: "Send HTML responses with ctx.send.html()."
---

# HTML Responses

The `ctx.send.html()` method creates HTML responses.

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

## Custom Headers

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Set a header before sending
  ctx.setHeader('X-Frame-Options', 'DENY')
  return ctx.send.html('<html><body>Content</body></html>')
}
```
