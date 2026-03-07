# Response Stream

Method `ctx.send.stream()` mengembalikan response body dari `ReadableStream`, berguna untuk streaming data besar atau server-sent events tanpa buffering penuh.

## Penggunaan Dasar

```typescript
// 1. Import tipe Context
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  // 2. Buat ReadableStream (contoh: kirim dua chunk teks)
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('Hello\n'))
      controller.enqueue(new TextEncoder().encode('World\n'))
      controller.close()
    }
  })
  // 3. Kirim response dengan body stream
  return ctx.send.stream(stream)
}
```

## Dengan Content-Type Kustom

Parameter ketiga adalah content type (default `application/octet-stream`):

```typescript
export function GET(ctx: Context): Response {
  // 1. Siapkan stream (definisikan di tempat lain)
  const stream = new ReadableStream({ ... })
  // 2. Param ketiga: content-type (default application/octet-stream)
  return ctx.send.stream(stream, undefined, 'text/plain')
}
```

## Dengan Status Dan Headers

```typescript
export function GET(ctx: Context): Response {
  // 1. Siapkan stream
  const stream = new ReadableStream({ ... })
  // 2. Param kedua: status + headers; ketiga: content-type
  return ctx.send.stream(stream, {
    status: 200,
    headers: { 'X-Custom': 'value' }
  }, 'application/x-ndjson')
}
```

## Signature Method

```typescript
ctx.send.stream(
  stream: ReadableStream,
  options?: ResponseInit,
  contentType?: string
): Response
```

- **stream** - ReadableStream yang dipakai sebagai body response
- **options** - Opsional; status dan headers (ResponseInit)
- **contentType** - Opsional; default `'application/octet-stream'`
