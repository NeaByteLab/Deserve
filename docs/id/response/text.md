---
description: "Kirim response teks biasa dengan ctx.send.text()."
---

# Response Teks

Method `ctx.send.text()` membuat response teks biasa.

## Penggunaan Dasar

```typescript twoslash
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  // Default text/plain
  return ctx.send.text('Hello World')
}
```

## Dengan Status Code

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function POST(ctx: Context): Response {
  // Balas Not Implemented dengan 501
  return ctx.send.text('Not Implemented', { status: 501 })
}
```

## Pesan Error

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Error teks biasa dengan status 500
  return ctx.send.text('Internal Server Error', { status: 500 })
}
```

## Header Kustom

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Tambah header lewat opsi
  return ctx.send.text('Hello World', {
    headers: {
      'Content-Language': 'en',
      'X-Custom': 'value'
    }
  })
}
```
