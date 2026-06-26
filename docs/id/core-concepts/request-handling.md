---
description: "Cara Deserve mengurai dan menangani request masuk, termasuk parsing body dan negosiasi konten."
---

# Penanganan Request

> **Referensi**: [Dokumentasi API Request Deno](https://docs.deno.com/deploy/classic/api/runtime-request/)

Deserve menyediakan objek `Context` yang membungkus `Request` native, jadi query, route param, header, cookie, dan body semua lewat Context tanpa parsing manual. Untuk permukaan Context lengkap, termasuk helper response dan penanganan error, lihat [Objek Context](/id/core-concepts/context-object).

Sebuah handler menerima satu `Context` dan membaca apa pun yang dibutuhkannya dari namespace `ctx.get`:

```typescript twoslash
import type { Context } from '@neabyte/deserve'

// Baca data request dari ctx.get
export function GET(ctx: Context): Response {
  const query = ctx.get.query()
  return ctx.send.json({ query })
}
```

Bagian di bawah membahas tiap jenis input. Setiap pembaca berada di `ctx.get` dan didokumentasikan lengkap di [Objek Context](/id/core-concepts/context-object).

## Parameter Query

Query string diurai saat akses pertama, lalu di-cache. `ctx.get.query()` mengembalikan record lengkap, dan `ctx.get.query(key)` mengembalikan satu nilai. Nilai pertama menang untuk kunci ganda:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
// URL: /search?q=deno&limit=10
export function GET(ctx: Context): Response {
  const query = ctx.get.query()
  return ctx.send.json({
    search: query.q,
    limit: parseInt(query.limit || '10')
  })
}
```

Ketika sebuah kunci berulang di URL, nilai pertama yang disimpan:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// URL: /search?tag=deno&tag=typescript
ctx.get.query('tag')  // 'deno', nilai pertama menang
ctx.get.query()       // { tag: 'deno' }
```

## Parameter Rute

Segmen dinamis dari [routing berbasis file](/id/core-concepts/file-based-routing) tiba sebagai route param, dibaca satu per satu dengan `ctx.get.param(key)` atau sekaligus dengan `ctx.get.param()`:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
// routes/users/[id]/posts/[postId].ts
// URL: /users/123/posts/456
export function GET(ctx: Context): Response {
  const id = ctx.get.param('id')   // '123'
  const all = ctx.get.param()      // { id: '123', postId: '456' }
  return ctx.send.json({ id, all })
}
```

Nilai di-percent-decode sekali sebelum handler membacanya. Cara pola dicocokkan dibahas di [Pola Rute](/id/core-concepts/route-patterns).

## Header

Header dibaca lewat `ctx.get.header()`. Beri sebuah kunci untuk membaca satu header, atau panggil tanpa argumen untuk membaca semua header sebagai record. Kunci dicocokkan tanpa membedakan huruf besar kecil:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// Baca satu header berdasarkan nama
const contentType = ctx.get.header('content-type')

// Baca semua header sebagai record
const headers = ctx.get.header()
```

Untuk akses langsung ke objek `Headers` native, pakai `ctx.get.request().headers`:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// Akses Headers API mentah
const contentType = ctx.get.request().headers.get('Content-Type')
```

## Cookie

Cookie dibaca lewat `ctx.get.cookie()`. Beri sebuah kunci untuk membaca satu cookie, atau panggil tanpa argumen untuk membaca semua cookie sebagai record. Cookie diurai sekali lalu di-cache untuk panggilan berikutnya:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// Baca satu cookie berdasarkan nama
const sessionId = ctx.get.cookie('sessionId')

// Baca semua cookie sebagai record
const cookies = ctx.get.cookie() // { sessionId: 'abc123', theme: 'dark' }
```

## Body

Body dibaca lewat salah satu dari beberapa method async di `ctx.get`. Formatnya dipilih otomatis oleh `ctx.get.body()` berdasarkan header `Content-Type`, atau dipaksa dengan memanggil pembaca tertentu:

| Method | Format | Content-Type |
| ------ | ------ | ------------ |
| `ctx.get.body()` | Deteksi otomatis | JSON, form-data, atau teks |
| `ctx.get.json()` | JSON | Apa saja |
| `ctx.get.text()` | Teks polos | Apa saja |
| `ctx.get.formData()` | Form data | Apa saja |
| `ctx.get.blob()` | Blob | Apa saja |
| `ctx.get.bytes()` | Uint8Array | Apa saja |

Body hanya bisa dibaca sekali. Panggilan kedua dengan format sama mengembalikan nilai dari cache, sedangkan panggilan kedua dengan format berbeda melempar **409 Conflict**.

### Body Deteksi Otomatis

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
// POST /api/users dengan body JSON
export async function POST(ctx: Context): Promise<Response> {
  // Body diparsing dari Content-Type
  const body = await ctx.get.body()
  return ctx.send.json({ created: body })
}
```

### Body JSON

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
// POST /api/users dengan body JSON
export async function POST(ctx: Context): Promise<Response> {
  // Parsing body sebagai JSON
  const body = await ctx.get.json()
  return ctx.send.json({ created: body })
}
```

### Form Data

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
// POST /api/users dengan form data
export async function POST(ctx: Context): Promise<Response> {
  // Parsing body sebagai form data
  const formData = await ctx.get.formData()
  const name = formData.get('name')
  return ctx.send.json({ name })
}
```

### Teks Mentah

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
// POST /api/text dengan teks polos
export async function POST(ctx: Context): Promise<Response> {
  // Baca body sebagai teks polos
  const text = await ctx.get.text()
  return ctx.send.text(text)
}
```

### Data Biner

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
// POST /api/upload dengan data biner
export async function POST(ctx: Context): Promise<Response> {
  // Baca body sebagai byte array
  const bytes = await ctx.get.bytes()
  return ctx.send.json({ size: bytes.byteLength })
}
```

## URL dan Pathname

Detail URL dibaca lewat `ctx.get.url()` dan `ctx.get.pathname()`:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  const url = ctx.get.url()       // URL instance
  const pathname = ctx.get.pathname() // '/api/users/123'
  return ctx.send.json({
    path: pathname,
    fullUrl: url.href
  })
}
```

## IP Klien

IP klien dibaca lewat `ctx.get.ip()`. Beri `{ direct: true }` untuk membaca peer TCP langsung alih-alih IP yang sudah diresolusi:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  const client = ctx.get.ip()                // IP pengunjung yang diresolusi
  const peer = ctx.get.ip({ direct: true })  // peer TCP langsung
  return ctx.send.json({ client, peer })
}
```

Keduanya mengembalikan `undefined` ketika peer tidak diketahui. Tanpa aturan [`trustProxy`](/id/getting-started/server-configuration#resolusi-ip-klien) yang cocok, keduanya mengembalikan alamat peer langsung yang sama. [Middleware pembatasan IP](/id/middleware/ip) memakai `ctx.get.ip()` untuk aturan allow dan deny-nya.

## Memvalidasi Sebelum Handler

Setiap pembaca di atas mengembalikan nilai mentah seperti saat tiba, jadi handler tetap memeriksa bentuknya sendiri. Sebuah schema memindahkan pemeriksaan itu ke depan handler, menjalankan kontrak terhadap tiap sumber, dan menyisakan hanya data yang sudah lolos. Lihat [Ringkasan Validasi](/id/middleware/validation/overview) untuk bagaimana `ctx.get.json()`, `ctx.get.query()`, dan pembaca lain mengisi sebuah kontrak.
