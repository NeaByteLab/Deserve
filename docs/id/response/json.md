---
description: "Kirim response JSON dengan ctx.send.json(), termasuk status code dan header."
---

# Response JSON

Method `ctx.send.json()` membuat response JSON. Method ini menserialisasi data dengan `JSON.stringify()` dan mengatur `Content-Type: application/json` otomatis.

## Penggunaan Dasar

```typescript twoslash
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  // Default application/json
  return ctx.send.json({
    message: 'Hello World'
  })
}
```

## Dengan Status Code

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export async function POST(ctx: Context): Promise<Response> {
  // Baca body request hasil parse
  const data = await ctx.get.body()
  // Balas Created dengan status 201
  return ctx.send.json(
    { message: 'Created successfully', data },
    { status: 201 }
  )
}
```

Nilai `status` harus integer dalam rentang 200-599, atau salah satu kode tanpa body `101`, `204`, `205`, dan `304` yang mengirim body kosong. Nilai lain melempar `Deno.errors.InvalidData`. Aturan ini berlaku untuk setiap helper `ctx.send`.

Di sini `ctx.get.body()` mengembalikan apa pun yang dikirim client, jadi handler yang bergantung pada bentuknya menjalankan kontrak [validasi](/id/middleware/validation/overview) lebih dulu dan membaca data bertipe yang sudah lolos.

## Dengan Header Kustom

Header yang diatur lewat `ctx.set.header()` digabung ke response. Header opsi diutamakan saat bentrok:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Atur header sebelum kirim
  ctx.set.header('Cache-Control', 'no-cache')
  return ctx.send.json({
    data: 'sensitive'
  })
}
```

Header juga bisa diberikan lewat opsi:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  return ctx.send.json(
    { data: 'sensitive' },
    {
      headers: {
        'Cache-Control': 'no-cache',
        'X-Request-ID': 'abc123'
      }
    }
  )
}
```

## Data Kompleks

Object dan array bersarang diserialisasi apa adanya:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  const data = {
    users: [
      { id: 1, name: 'Alice', email: 'alice@example.com' },
      { id: 2, name: 'Bob', email: 'bob@example.com' }
    ],
    pagination: {
      page: 1,
      total: 2,
      hasNext: false
    },
    timestamp: new Date().toISOString()
  }
  return ctx.send.json(data)
}
```

## Error Response

Sebuah handler bisa membentuk body error sekali pakai seperti ini:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Body error dengan status 404
  return ctx.send.json(
    { error: 'User not found' },
    { status: 404 }
  )
}
```

Error yang dilempar mengalir lewat satu tempat alih-alih, dibahas di [Detail Objek Error](/id/error-handling/object-details). Untuk bentuk error yang konsisten di seluruh aplikasi, pakai [`ctx.handleError()`](/id/core-concepts/context-object#penanganan-error) alih-alih membangun setiap response dengan tangan.

## Tanda Tangan Method

```typescript
ctx.send.json<T = unknown>(data: T, options?: SendInit): Response
```

- **data** - nilai untuk diserialisasi sebagai JSON
- **options** - `status` dan `headers` opsional
