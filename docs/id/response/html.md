# Response HTML

Method `ctx.send.html()` membuat response HTML.

## Penggunaan Dasar

```typescript
// 1. Import tipe Context
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  // 2. String HTML + kirim (Content-Type: text/html)
  const html = '<html><body><h1>Hello World</h1></body></html>'
  return ctx.send.html(html)
}
```

## HTML Dinamis

```typescript
export function GET(ctx: Context): Response {
  // 1. Bangun HTML (bisa template literal, atau dari engine)
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
  // 2. Kirim sebagai response HTML
  return ctx.send.html(html)
}
```

## Dengan Status Code Kustom

```typescript
export function GET(ctx: Context): Response {
  // 1. Halaman "Not Found" + status 404
  const html = '<html><body><h1>Not Found</h1></body></html>'
  return ctx.send.html(html, { status: 404 })
}
```

## Header Kustom

```typescript
export function GET(ctx: Context): Response {
  // 1. Atur security header
  ctx.setHeader('X-Frame-Options', 'DENY')
  // 2. Kirim HTML (header ikut terkirim)
  return ctx.send.html('<html><body>Content</body></html>')
}
```
