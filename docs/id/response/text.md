---
description: "Kirim response teks biasa dengan ctx.send.text()."
---

# Response Teks

Method `ctx.send.text()` membuat response teks biasa. Method ini mengatur `Content-Type: text/plain; charset=utf-8` otomatis.

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

Nilai `status` harus integer dalam rentang 200-599, atau salah satu kode tanpa body `101`, `204`, `205`, dan `304`. Nilai lain melempar `Deno.errors.InvalidData`.

## Dengan Header Kustom

Header yang diatur lewat `ctx.set.header()` digabung ke response. Header opsi diutamakan saat bentrok:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Atur header sebelum kirim
  ctx.set.header('X-Custom', 'value')
  return ctx.send.text('Hello World', {
    headers: {
      'Content-Language': 'en'
    }
  })
}
```

## Pesan Error

Sebuah handler bisa mengembalikan body error teks biasa, tetapi error yang dilempar mengalir lewat satu tempat alih-alih, dibahas di [Detail Objek Error](/id/error-handling/object-details). Untuk bentuk error yang konsisten, pakai [`ctx.handleError()`](/id/core-concepts/context-object#penanganan-error).

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Error teks biasa dengan status 500
  return ctx.send.text('Internal Server Error', { status: 500 })
}
```

## Tanda Tangan Method

```typescript
ctx.send.text(text: string, options?: SendInit): Response
```

- **text** - body response teks biasa
- **options** - `status` dan `headers` opsional
