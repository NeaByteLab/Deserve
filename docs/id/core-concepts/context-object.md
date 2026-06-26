---
description: "Objek Context yang diteruskan ke setiap handler: baca request, atur response, kirim response, dan tangani error."
---

# Objek Context

Objek `Context` membungkus `Request` native dan memberi setiap handler satu permukaan untuk membaca request, membentuk response, dan meneruskan error. Satu `Context` mengalir dari middleware ke route handler, jadi data tetap ter-cache dan konsisten sepanjang request.

## Apa Itu Context

Context adalah pembungkus di sekitar objek `Request` native Deno, dan setiap request masuk dibungkus dalam satu Context yang mengalir dari middleware ke route handler. Bekerja lewat Context alih-alih `Request` mentah membawa:

- **Parsing tertunda** - data diurai hanya saat sebuah method membacanya
- **Tiga namespace** - `ctx.get` membaca, `ctx.set` membentuk, `ctx.send` mengirim
- **Baca ter-cache** - body, cookie, dan param diurai sekali lalu memakai ulang cache
- **Routing error** - `ctx.handleError()` meneruskan kegagalan ke satu tempat

## Membuat Context

Deserve membuat Context otomatis ketika request tiba, jadi handler cukup mendeklarasikannya sebagai parameter:

```typescript twoslash
import type { Context } from '@neabyte/deserve'

// Deserve membangun ctx tiap request
export function GET(ctx: Context): Response {
  return ctx.send.json({
    message: 'Hello'
  })
}
```

## Tiga Namespace

Context membagi API-nya menjadi tiga namespace beku, masing-masing dengan satu tugas:

| Namespace | Tujuan | Contoh |
| --------- | ------ | ------ |
| `ctx.get` | Baca data request | `ctx.get.header('host')` |
| `ctx.set` | Bentuk response | `ctx.set.header('X-Custom', 'value')` |
| `ctx.send` | Bangun dan kirim response | `ctx.send.json({ ok: true })` |

Namespace bersifat beku, jadi tidak bisa ditugaskan ulang atau dimutasi saat runtime. Ini menjaga kontrak request tetap dapat ditebak di seluruh middleware dan handler.

## Membaca Data Request

### `ctx.get.ip(options?)`

Membaca alamat IP klien. Beri `{ direct: true }` untuk membaca peer TCP langsung alih-alih IP yang diresolusi:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// IP yang diresolusi, menghormati trustProxy
const client = ctx.get.ip()

// Peer TCP langsung, abaikan header forwarded
const peer = ctx.get.ip({ direct: true })
```

Keduanya mengembalikan `undefined` ketika peer tidak diketahui. Tanpa aturan [`trustProxy`](/id/getting-started/server-configuration#resolusi-ip-klien) yang cocok, keduanya mengembalikan alamat peer langsung yang sama.

### `ctx.get.method()`

Membaca metode HTTP request:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
const method = ctx.get.method() // 'GET', 'POST', dll
```

### `ctx.get.url()`

Membaca instance URL request yang sudah diurai:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
const url = ctx.get.url() // URL instance
const fullUrl = url.href    // 'http://localhost:8000/api/users?sort=name'
```

### `ctx.get.pathname()`

Membaca bagian pathname dari URL:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
const path = ctx.get.pathname() // '/api/users/123'
```

### `ctx.get.request()`

Membaca instance `Request` native di bawahnya:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
const req = ctx.get.request() // Request instance
```

### `ctx.get.header(key?)`

Membaca satu header berdasarkan kunci atau setiap header sekaligus. Kunci dicocokkan tanpa membedakan huruf besar kecil:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// Baca satu header berdasarkan nama
const contentType = ctx.get.header('content-type')

// Baca semua header sebagai record
const headers = ctx.get.header()
```

### `ctx.get.cookie(key?)`

Membaca satu cookie berdasarkan kunci atau setiap cookie sekaligus. Cookie diurai sekali lalu di-cache untuk panggilan berikutnya:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// Baca satu cookie berdasarkan nama
const sessionId = ctx.get.cookie('sessionId')

// Baca semua cookie sebagai record
const cookies = ctx.get.cookie() // { sessionId: 'abc123', theme: 'dark' }
```

### `ctx.get.query(key?)`

Membaca satu parameter query berdasarkan kunci atau setiap parameter query sekaligus. Nilai pertama menang untuk kunci ganda:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// URL: /search?q=deno&limit=10
const q = ctx.get.query('q')     // 'deno'
const all = ctx.get.query()      // { q: 'deno', limit: '10' }

// URL: /search?tag=deno&tag=typescript
ctx.get.query('tag')             // 'deno', nilai pertama menang
ctx.get.query()                  // { tag: 'deno' }
```

### `ctx.get.param(key?)`

Membaca satu parameter rute berdasarkan kunci atau setiap parameter rute sekaligus. Nilai di-percent-decode sekali sebelum handler membacanya:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// Route: /users/[id]/posts/[postId]
// URL: /users/123/posts/456
const id = ctx.get.param('id')   // '123'
const all = ctx.get.param()      // { id: '123', postId: '456' }
```

### `ctx.get.body()`

Mengurai body request otomatis berdasarkan header `Content-Type`. JSON, form-data, dan teks semua ditangani. Membaca bersifat async, jadi handler yang me-await-nya menjadi `async`:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export async function POST(ctx: Context): Promise<Response> {
  // Body diparsing dari Content-Type
  const body = await ctx.get.body()
  return ctx.send.json({ received: body })
}
```

Body hanya bisa dibaca sekali. Panggilan kedua dengan format sama mengembalikan nilai dari cache, sedangkan panggilan kedua dengan format berbeda melempar **409 Conflict**.

### `ctx.get.json()`

Mengurai body request sebagai JSON, terlepas dari header `Content-Type`:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export async function POST(ctx: Context): Promise<Response> {
  // Parsing body sebagai JSON
  const body = await ctx.get.json()
  return ctx.send.json({ received: body })
}
```

### `ctx.get.text()`

Membaca body request sebagai teks mentah:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export async function POST(ctx: Context): Promise<Response> {
  // Baca body sebagai teks polos
  const text = await ctx.get.text()
  return ctx.send.text(text)
}
```

### `ctx.get.formData()`

Mengurai body request sebagai form data dan mengembalikan objek `FormData`:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export async function POST(ctx: Context): Promise<Response> {
  // Parsing body sebagai form data
  const formData = await ctx.get.formData()
  const name = formData.get('name')
  return ctx.send.json({ name })
}
```

### `ctx.get.blob()`

Membaca body request sebagai `Blob`, yang cocok untuk unggahan berkas dan penanganan biner:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export async function POST(ctx: Context): Promise<Response> {
  // Baca body sebagai Blob
  const blob = await ctx.get.blob()
  return ctx.send.json({
    type: blob.type,
    size: blob.size
  })
}
```

### `ctx.get.bytes()`

Membaca body request sebagai `Uint8Array`, yang cocok untuk pemrosesan data biner:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export async function POST(ctx: Context): Promise<Response> {
  // Baca body sebagai byte array
  const bytes = await ctx.get.bytes()
  return ctx.send.json({
    size: bytes.byteLength
  })
}
```

### `ctx.get.session()`

Membaca data session saat ini. Membutuhkan [middleware session](/id/middleware/session) terdaftar, jika tidak mengembalikan `null`:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// Baca data session saat ini
const session = ctx.get.session()
```

### `ctx.get.validated()`

Membaca data request yang sudah tervalidasi. Membutuhkan [middleware validate](/id/middleware/validation/overview) terdaftar. Melempar saat middleware tidak ada:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// Baca data yang sudah lolos validasi
const validated = ctx.get.validated()
```

### `ctx.get.worker()`

Membaca controller worker pool untuk mengirim tugas CPU-bound. Membutuhkan [worker pool](/id/recipes/worker-pool) terkonfigurasi. Melempar saat tidak ada pool:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// Ambil controller worker pool
const worker = ctx.get.worker()
```

## Membentuk Response

### `ctx.set.header(key, value)`

Mengatur satu header response. Mengembalikan namespace `ctx.set` untuk chaining:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Atur satu header, lalu chain yang lain
  ctx.set
    .header('X-Custom', 'value')
    .header('Cache-Control', 'no-cache')
  return ctx.send.json({ data: 'test' })
}
```

### `ctx.set.headers(record)`

Mengatur beberapa header response sekaligus. Mengembalikan namespace `ctx.set` untuk chaining:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Atur beberapa header sekaligus
  ctx.set.headers({
    'X-Custom': 'value',
    'Cache-Control': 'no-cache',
    'X-Request-ID': 'abc123'
  })
  return ctx.send.json({ data: 'test' })
}
```

### `ctx.set.cookie(name, value, options?)`

Mengatur cookie response dengan atribut opsional. Mengembalikan namespace `ctx.set` untuk chaining:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Atur cookie dengan atribut
  ctx.set.cookie('session', 'abc123', {
    httpOnly: true,
    maxAge: 3600,
    path: '/',
    sameSite: 'Lax',
    secure: true
  })
  return ctx.send.json({ ok: true })
}
```

Objek `options` menerima `domain`, `expires`, `httpOnly`, `maxAge`, `path`, `sameSite`, dan `secure`.

### `ctx.set.session(data)`

Menulis data session lewat session controller. Membutuhkan [middleware session](/id/middleware/session) terdaftar. Melempar saat middleware tidak ada:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// Tulis data session
await ctx.set.session({ userId: '123' })

// Hapus data session
await ctx.set.session(null)
```

## Mengirim Response

### `ctx.send.json(data, options?)`

Mengirim response JSON:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  return ctx.send.json(
    { message: 'Hello' },
    { status: 200 }
  )
}
```

### `ctx.send.text(text, options?)`

Mengirim response teks polos:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  return ctx.send.text('Hello World')
}
```

### `ctx.send.html(html, options?)`

Mengirim response HTML:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  return ctx.send.html('<h1>Hello World</h1>')
}
```

### `ctx.send.custom(body, options?)`

Mengirim body response khusus. Pakai ini untuk stream, blob, atau `BodyInit` apa pun:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Kirim readable stream sebagai response
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('Hello'))
      controller.close()
    }
  })
  return ctx.send.custom(stream)
}
```

### `ctx.send.download(body, filename, options?)`

Mengirim response unduhan berkas dengan header `Content-Disposition`:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Picu unduhan berkas
  return ctx.send.download(
    'Hello World',
    'hello.txt'
  )
}
```

### `ctx.send.empty(status?)`

Mengirim body response kosong dengan status code opsional:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // 204 No Content
  return ctx.send.empty(204)
}
```

### `ctx.send.redirect(url, status?, options?)`

Mengirim response redirect. Status default ke `302`. URL target diresolusi terhadap URL request dan diblokir dari menyeberang origin kecuali diberikan sebagai URL `https://` atau `http://` lengkap:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Redirect ke lokasi baru
  return ctx.send.redirect('/new-location', 301)
}
```

Status redirect yang diizinkan adalah `301`, `302`, `303`, `307`, dan `308`. Status lain melempar.

## Merender Template

Ketika router punya `views.directory` terkonfigurasi, Context bisa merender template DVE langsung:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export async function GET(ctx: Context): Promise<Response> {
  // Render template ke response HTML
  return await ctx.render(
    'home.dve',
    { title: 'Welcome' }
  )
}
```

Beri `{ stream: true }` sebagai argumen ketiga untuk men-stream keluaran pada halaman besar:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// Stream render template besar
await ctx.render('dashboard.dve', { users: [] }, { stream: true })
```

Keduanya melempar ketika tidak ada `views.directory` yang dikonfigurasi. Lihat [Sintaks Template](/id/rendering/syntax) untuk tata bahasa template dan [Streaming Rendering](/id/rendering/streaming) untuk jalur streaming.

## Penanganan Error

`ctx.handleError()` membangun response error dan meneruskannya lewat error handler global yang diatur dengan `router.catch()`. Method ini async, jadi handler yang memanggilnya menjadi `async` dan me-await hasilnya:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const isAuthorized: boolean
// ---cut---
export async function GET(ctx: Context): Promise<Response> {
  try {
    if (!isAuthorized) {
      // Teruskan ke error handler
      return await ctx.handleError(401, new Error('Unauthorized'))
    }
    return ctx.send.json({ data: 'success' })
  } catch (error) {
    // Tangkap kegagalan tak terduga
    return await ctx.handleError(500, error as Error)
  }
}
```

### Cara Kerja

`ctx.handleError()` menghormati error handler global yang diatur dengan [`router.catch()`](/id/error-handling/object-details):

- **Ketika `router.catch()` didefinisikan** - error handler khusus berjalan dan bisa membentuk response
- **Ketika tidak ada error handler** - response default membawa status code, dinegosiasi sebagai JSON atau HTML berdasarkan header `Accept`

### Pakai di Middleware

Middleware bisa memanggil `ctx.handleError()` untuk memicu penanganan error sama seperti handler:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
declare const isValid: boolean
// ---cut---
router.use(async (ctx, next) => {
  if (!isValid) {
    // Dialihkan lewat router.catch() saat didefinisikan
    return await ctx.handleError(401, new Error('Unauthorized'))
  }
  return await next()
})
```

Lihat [Penanganan Error](/id/error-handling/object-details) untuk pola terpusat lengkapnya, dan [Defense in Depth](/id/error-handling/defense-in-depth) untuk cara error ditangkap berlapis.

## Siklus Hidup Context

1. **Request tiba** - Deserve membuat Context dengan `Request`, `URL` terurai, IP klien, dan renderer opsional
2. **Pencocokan rute** - parameter rute diekstrak dan dipasang ke Context
3. **Eksekusi middleware** - Context melewati rantai middleware
4. **Route handler** - handler menerima Context dan membaca atau mengirim lewat tiga namespace
5. **Response dikirim** - `ctx.send.*` atau `ctx.handleError()` membangun `Response` akhir
