---
description: "Kirim response streaming dari ReadableStream dengan ctx.send.stream()."
---

# Response Stream

Method `ctx.send.stream()` mengembalikan body response dari `ReadableStream`, berguna untuk streaming data besar atau server-sent events tanpa buffering penuh.

## Penggunaan Dasar

```typescript twoslash
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  // Dorong dua chunk teks lalu tutup
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('Hello\n'))
      controller.enqueue(new TextEncoder().encode('World\n'))
      controller.close()
    }
  })
  // Stream menjadi body response
  return ctx.send.stream(stream)
}
```

## Dengan Content-Type Kustom

Parameter ketiga adalah content type dan defaultnya `application/octet-stream`:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('Hello'))
      controller.close()
    }
  })
  // Argumen ketiga mengatur content type
  return ctx.send.stream(stream, undefined, 'text/plain')
}
```

## Dengan Status dan Header

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('{"ok":true}\n'))
      controller.close()
    }
  })
  // Argumen kedua status, ketiga tipe
  return ctx.send.stream(stream, {
    status: 200,
    headers: { 'X-Custom': 'value' }
  }, 'application/x-ndjson')
}
```

## Method Signature

```typescript
ctx.send.stream(
  stream: ReadableStream,
  options?: ResponseInit,
  contentType?: string
): Response
```

- **stream** - ReadableStream yang dipakai sebagai body response
- **options** - status dan header opsional (ResponseInit)
- **contentType** - opsional, default `'application/octet-stream'`
