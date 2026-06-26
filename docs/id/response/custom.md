---
description: "Bangun response sepenuhnya kustom dengan ctx.send.custom() saat helper lain tidak cukup."
---

# Response Kustom

Method `ctx.send.custom()` membuat response dengan kendali penuh atas body. Berbeda dengan helper bertipe, method ini tidak mengatur `Content-Type` sendiri, jadi tambahkan lewat header saat body membutuhkannya.

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

Header yang diatur lewat `ctx.set.header()` digabung dengan header dari opsi. Header opsi diutamakan saat bentrok:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Header diatur pada context
  ctx.set.header('X-Custom', 'value')
  // Opsi bisa menambah header lain
  return ctx.send.custom('Response body', {
    headers: {
      'Content-Type': 'application/xml',
      'X-Additional': 'header'
    }
  })
}
```

## Response Streaming

Sebuah `ReadableStream` yang diberikan sebagai body dialirkan ke client tanpa membuffer seluruh response. Ini cocok untuk data besar atau [server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events):

```typescript twoslash
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  // Dorong dua potongan teks lalu tutup
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('Hello\n'))
      controller.enqueue(new TextEncoder().encode('World\n'))
      controller.close()
    }
  })
  // Stream menjadi body response
  return ctx.send.custom(stream, {
    headers: {
      'Content-Type': 'text/plain'
    }
  })
}
```

Untuk streaming template, pakai [`ctx.render()`](/id/core-concepts/context-object#merender-template) dengan `stream: true` alih-alih, yang menangani mesin DVE dan content type untukmu.

## Response Biner

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Kirim byte mentah dengan tipe
  const binaryData = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f])
  return ctx.send.custom(binaryData, {
    headers: {
      'Content-Type': 'application/octet-stream'
    }
  })
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
    headers: {
      'Content-Type': 'application/xml'
    }
  })
}
```

## Tanda Tangan Method

```typescript
ctx.send.custom(body: BodyInit | null, options?: SendInit): Response
```

- **body** - nilai `BodyInit` apa pun (string, `Blob`, `BufferSource`, `ReadableStream`, dll.) atau `null`
- **options** - `status` dan `headers` opsional
