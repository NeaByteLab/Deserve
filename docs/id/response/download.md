---
description: "Kirim response unduhan berkas dengan ctx.send.download(), termasuk Content-Disposition dan penanganan nama berkas."
---

# Response Download

Method `ctx.send.download()` mengirim response yang memicu unduhan berkas di browser. Method ini mengatur `Content-Disposition: attachment` dengan nama berkas yang diberikan dan default `Content-Type` ke `application/octet-stream`.

Ini menggantikan kebutuhan helper terpisah untuk berkas dan data in-memory. Body bisa berupa string, `BufferSource` (seperti `Uint8Array`), atau `ReadableStream` - apa pun yang sudah ada di tangan handler.

## Penggunaan Dasar

```typescript twoslash
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  // Body string dengan nama unduhan
  const csv = 'name,age\nAlice,30\nBob,25'
  return ctx.send.download(csv, 'users.csv')
}
```

## Data Biner

Body `Uint8Array` bekerja dengan cara yang sama:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Body Uint8Array dengan nama unduhan
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
  return ctx.send.download(png, 'image.png')
}
```

## Streaming Dari Filesystem

Untuk mengirim berkas dari disk, buka sebuah `ReadableStream` dan berikan sebagai body. Handler menjadi `async` karena `Deno.open` bersifat async:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare function createFileStream(): ReadableStream<Uint8Array>
// ---cut---
export async function GET(ctx: Context): Promise<Response> {
  // Buka berkas sebagai readable stream
  const stream = createFileStream()
  // Stream menjadi body unduhan
  return ctx.send.download(stream, 'document.pdf')
}
```

Berkas yang hilang atau tidak terbaca melempar `Deno.errors.NotFound`. Tangkap dan teruskan ke [error handler terpusat](/id/error-handling/object-details) untuk balasan yang konsisten:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare function createFileStream(): ReadableStream<Uint8Array>
// ---cut---
export async function GET(ctx: Context): Promise<Response> {
  try {
    const stream = createFileStream()
    return ctx.send.download(stream, 'document.pdf')
  } catch (error) {
    // Alirkan kegagalan lewat penanganan error
    return await ctx.handleError(404, error as Error)
  }
}
```

## Dengan Content Type Kustom

Default `Content-Type` adalah `application/octet-stream`. Timpa lewat header opsi saat browser butuh tipe tertentu:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  const json = JSON.stringify({ data: 'value' })
  return ctx.send.download(
    json,
    'data.json',
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  )
}
```

## Pembuatan Berkas Dinamis

Bangun payload saat runtime dan kirim sebagai unduhan tanpa menyentuh disk:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Bangun payload saat runtime
  const data = {
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  }
  const content = JSON.stringify(data, null, 2)
  // Unduh tanpa menyentuh disk
  return ctx.send.download(content, 'metadata.json')
}
```

## Penanganan Nama Berkas

Nama berkas dibersihkan sebelum mencapai header `Content-Disposition`:

- Path direktori dipangkas, jadi `../secret.txt` menjadi `secret.txt`
- Karakter kontrol dihapus
- Karakter non-ASCII mendapat fallback `filename*=UTF-8''...` di samping nama ASCII
- Nama berkas kosong atau seluruhnya tidak valid jatuh ke `download`

## Tanda Tangan Method

```typescript
ctx.send.download(
  body: ReadableStream<Uint8Array> | BufferSource | string,
  filename: string,
  options?: SendInit
): Response
```

- **body** - konten unduhan sebagai string, `BufferSource`, atau `ReadableStream`
- **filename** - nama berkas unduhan yang disarankan, dibersihkan otomatis
- **options** - `status` dan `headers` opsional
