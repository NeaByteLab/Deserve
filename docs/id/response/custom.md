---
description: "Bangun response sepenuhnya kustom dengan ctx.send.custom() saat helper lain tidak cukup."
---

# Response Kustom

Method `ctx.send.custom()` membuat response kustom dengan kendali penuh atas body, status code, header, dan semua opsi konfigurasi response. Berbeda dengan helper bertipe, method ini tidak mengatur `Content-Type` sendiri, jadi tambahkan lewat header saat body membutuhkannya.

## Penggunaan Dasar

```typescript twoslash
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  // Status dan header tetap opsional
  return ctx.send.custom('Custom response body')
}
```

## Dengan Status Code

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Atur status response ke 404
  return ctx.send.custom('Not Found', { status: 404 })
}
```

## Dengan Header Kustom

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Header diatur pada context
  ctx.setHeader('X-Custom', 'value')
  // Opsi bisa menambah header lain
  return ctx.send.custom('Response body', {
    headers: {
      'Content-Type': 'application/xml',
      'X-Additional': 'header'
    }
  })
}
```

## Response Biner

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Kirim byte mentah dengan tipe
  const binaryData = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f])
  return ctx.send.custom(binaryData, {
    headers: { 'Content-Type': 'application/octet-stream' }
  })
}
```

## Response Kosong (No Content)

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // 204 mengirim body null
  return ctx.send.custom(null, { status: 204 })
}
```

## Response XML

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // String XML dengan tipe XML
  const xml = '<?xml version="1.0"?><data><message>Hello</message></data>'
  return ctx.send.custom(xml, {
    headers: { 'Content-Type': 'application/xml' }
  })
}
```

## Menggabungkan Header Context dan Opsi Kustom

Header yang diatur lewat `ctx.setHeader()` digabung dengan header dari parameter opsi:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  ctx.setHeader('X-Context-Header', 'from-context')
  return ctx.send.custom('Body', {
    headers: {
      'X-Options-Header': 'from-options'
    }
  })
  // Response membawa kedua header
}
```

Header opsi diutamakan di atas header context saat keduanya bentrok.
