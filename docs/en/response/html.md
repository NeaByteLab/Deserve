# HTML Responses

The `ctx.send.html()` method creates HTML responses.

## Basic Usage

```typescript
// 1. Import Context type
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  // 2. HTML string + send (Content-Type: text/html)
  const html = '<html><body><h1>Hello World</h1></body></html>'
  return ctx.send.html(html)
}
```

## Dynamic HTML

```typescript
export function GET(ctx: Context): Response {
  // 1. Build HTML (template literal or from engine)
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
  // 2. Send as HTML response
  return ctx.send.html(html)
}
```

## With Status Codes

```typescript
export function GET(ctx: Context): Response {
  // 1. "Not Found" page + status 404
  const html = '<html><body><h1>Not Found</h1></body></html>'
  return ctx.send.html(html, { status: 404 })
}
```

## Custom Headers

```typescript
export function GET(ctx: Context): Response {
  // 1. Set security header
  ctx.setHeader('X-Frame-Options', 'DENY')
  // 2. Send HTML (header sent with response)
  return ctx.send.html('<html><body>Content</body></html>')
}
```
