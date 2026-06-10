---
description: "Cara Deserve mengurai dan menangani request masuk, termasuk parsing body dan negosiasi konten."
---

# Penanganan Request

> **Referensi**: [Dokumentasi API Request Deno](https://docs.deno.com/deploy/classic/api/runtime-request/)

Deserve menyediakan objek `Context` yang membungkus `Request` native, jadi query, route param, header, cookie, dan body semua lewat Context tanpa parsing manual. Untuk permukaan Context lengkap, termasuk helper response dan state, lihat [Objek Context](/id/core-concepts/context-object).

Sebuah handler menerima satu `Context` dan membaca apa pun yang dibutuhkannya:

```typescript twoslash
import type { Context } from '@neabyte/deserve'

// Baca data request dari ctx
export function GET(ctx: Context): Response {
  const query = ctx.query()
  return ctx.send.json({ query })
}
```

Bagian di bawah membahas tiap jenis input, dan [Referensi Method](#referensi-method) mendaftar tiap pembaca dengan tipe kembaliannya.

## Parameter Query

Query string diurai saat akses pertama, lalu di-cache. Dua pembaca menangani setiap kasus, `query()` untuk satu nilai dan `queries()` untuk kunci berulang:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
// URL: /search?q=deno&limit=10
export function GET(ctx: Context): Response {
  const query = ctx.query()
  return ctx.send.json({
    search: query.q,
    limit: parseInt(query.limit || '10')
  })
}
```

Ketika sebuah kunci berulang di URL, `query()` menyimpan **nilai terakhir** sementara `queries()` mengembalikan **semuanya**:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// URL: /search?tag=deno&tag=typescript
ctx.query('tag') // 'typescript', nilai terakhir menang
ctx.queries('tag') // ['deno', 'typescript'], semua nilai
```

Gunakan `queries()` pada input array atau pilihan-ganda, dan `query()` untuk selainnya. Signature lengkap ada di [Referensi Method](#referensi-method).

## Parameter Rute

Segmen dinamis dari [routing berbasis file](/id/core-concepts/file-based-routing) tiba sebagai route param, dibaca satu per satu dengan `param()` atau sekaligus dengan `params()`:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
// routes/users/[id]/posts/[postId].ts
// URL: /users/123/posts/456
export function GET(ctx: Context): Response {
  const id = ctx.param('id') // '123'
  const all = ctx.params() // { id: '123', postId: '456' }
  return ctx.send.json({
    id,
    all
  })
}
```

Nilai di-percent-decode sekali sebelum handler membacanya. Cara pola dicocokkan dibahas di [Pola Rute](/id/core-concepts/route-patterns).

## Referensi Method

### `ctx.query(key?)`

Mengembalikan semua parameter query sebagai objek, dan mengembalikan **nilai terakhir untuk kunci ganda**.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// URL: /search?q=deno&limit=10
ctx.query() // { q: 'deno', limit: '10' }

// URL: /search?tag=deno&tag=typescript
ctx.query() // { tag: 'typescript' } ← nilai terakhir saja

// Parameter tunggal
const q = ctx.query('q') // Returns: 'deno'
```

### `ctx.queries(key)`

Mengembalikan **semua nilai** untuk satu kunci parameter query sebagai array.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// URL: /search?tags=deno&tags=typescript
const tags = ctx.queries('tags') // ['deno', 'typescript'] ← semua nilai

// query() menangani nilai tunggal atau terakhir, queries() menangani array dan pilihan-ganda
```

### `ctx.param(key)`

Mengembalikan satu nilai parameter rute.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// Route: /users/[id]
// URL: /users/123
const id = ctx.param('id') // '123'
```

### `ctx.params()`

Mengembalikan semua parameter rute sebagai objek.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// Route: /users/[id]/posts/[postId]
// URL: /users/123/posts/456
const params = ctx.params() // { id: '123', postId: '456' }
```

### `ctx.body()`

Mengurai body request otomatis sebagai JSON, form-data, atau teks.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
// POST /api/users dengan body JSON
export async function POST(ctx: Context): Promise<Response> {
  const body = await ctx.body() // { name: 'John', age: 30 }
  return ctx.send.json({
    created: body
  })
}
```

### `ctx.json()`

Mengurai body request sebagai JSON.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
// POST /api/users dengan body JSON
export async function POST(ctx: Context): Promise<Response> {
  const body = await ctx.json() // { name: 'John', age: 30 }
  return ctx.send.json({
    created: body
  })
}
```

### `ctx.formData()`

Mengurai body request sebagai form data dan mengembalikan objek `FormData`.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
// POST /api/users dengan form data
export async function POST(ctx: Context): Promise<Response> {
  const formData = await ctx.formData() // FormData object
  const name = formData.get('name') // 'John'
  return ctx.send.json({ name })
}
```

### `ctx.text()`

Membaca body request sebagai teks mentah.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
// POST /api/text dengan teks polos
export async function POST(ctx: Context): Promise<Response> {
  const text = await ctx.text() // 'Hello World'
  return ctx.send.text(text)
}
```

### `ctx.arrayBuffer()`

Membaca body request sebagai ArrayBuffer, yang cocok untuk pemrosesan data biner.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
// POST /api/upload dengan data biner
export async function POST(ctx: Context): Promise<Response> {
  const buffer = await ctx.arrayBuffer() // ArrayBuffer object
  // Proses data biner...
  return ctx.send.json({
    size: buffer.byteLength
  })
}
```

### `ctx.blob()`

Membaca body request sebagai Blob, yang cocok untuk unggahan berkas dan penanganan biner.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
// POST /api/upload dengan data berkas
export async function POST(ctx: Context): Promise<Response> {
  const blob = await ctx.blob() // Blob object
  // Proses data berkas...
  return ctx.send.json({
    type: blob.type,
    size: blob.size
  })
}
```

### `ctx.header(key?)`

Membaca satu header berdasarkan kunci atau setiap header sekaligus, mencocokkan kunci tanpa membedakan huruf besar kecil dan menjadikannya huruf kecil.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// Ambil header spesifik
const contentType = ctx.header('content-type')

// Ambil semua header sebagai objek
const headers = ctx.header()
```

### `ctx.headers`

Mengekspos objek Headers mentah untuk akses langsung.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// Akses Headers API mentah
const contentType = ctx.headers.get('Content-Type')
```

### `ctx.cookie(key?)`

Membaca satu cookie berdasarkan kunci atau setiap cookie sekaligus.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// Ambil cookie spesifik
const sessionId = ctx.cookie('sessionId')

// Ambil semua cookie
const cookies = ctx.cookie() // { sessionId: 'abc123', theme: 'dark' }
```
