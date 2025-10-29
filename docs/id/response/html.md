# Response HTML

Method `ctx.send.html()` membuat response HTML.

## Penggunaan Dasar

```typescript
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  const html = '<html><body><h1>Hello World</h1></body></html>'
  return ctx.send.html(html)
}
```

## HTML Dinamis

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

## Dengan Status Code

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

