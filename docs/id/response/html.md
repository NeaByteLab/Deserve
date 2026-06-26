---
description: "Kirim response HTML dengan ctx.send.html()."
---

# Response HTML

Method `ctx.send.html()` membuat response HTML. Method ini mengatur `Content-Type: text/html; charset=utf-8` otomatis.

## Penggunaan Dasar

```typescript twoslash
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  // Default text/html
  const html = '<html><body><h1>Hello World</h1></body></html>'
  return ctx.send.html(html)
}
```

## HTML Dinamis

Sebuah template literal membangun markup saat runtime:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Bangun markup dengan template literal
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

Untuk halaman lebih besar, render sebuah [template DVE](/id/rendering/) dengan `ctx.render()` alih-alih membangun HTML dengan tangan.

## Dengan Status Code

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Halaman Not Found dengan status 404
  const html = '<html><body><h1>Not Found</h1></body></html>'
  return ctx.send.html(html, { status: 404 })
}
```

## Dengan Header Kustom

Header yang diatur lewat `ctx.set.header()` digabung ke response:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Atur header sebelum kirim
  ctx.set.header('X-Frame-Options', 'DENY')
  return ctx.send.html('<html><body>Content</body></html>')
}
```

## Tanda Tangan Method

```typescript
ctx.send.html(html: string, options?: SendInit): Response
```

- **html** - body response string HTML
- **options** - `status` dan `headers` opsional
