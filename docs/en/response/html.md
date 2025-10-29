# HTML Responses

The `ctx.send.html()` method creates HTML responses.

## Basic Usage

```typescript
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  const html = '<html><body><h1>Hello World</h1></body></html>'
  return ctx.send.html(html)
}
```

## Dynamic HTML

```typescript
export function GET(ctx: Context): Response {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Welcome</title>
      </head>
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

```typescript
export function GET(ctx: Context): Response {
  const html = '<html><body><h1>Not Found</h1></body></html>'
  return ctx.send.html(html, { status: 404 })
}
```

## Custom Headers

```typescript
export function GET(ctx: Context): Response {
  ctx.setHeader('X-Frame-Options', 'DENY')
  return ctx.send.html('<html><body>Content</body></html>')
}
```
