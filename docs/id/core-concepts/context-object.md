---
description: "Objek Context yang diteruskan ke setiap handler: akses request, helper response, param, state, dan cookie."
---

# Objek Context

Objek `Context` membungkus `Request` native dan menyediakan method nyaman untuk mengakses data request, mengatur header response, dan mengirim response.

## Apa Itu Context?

Context adalah pembungkus di sekitar objek `Request` native Deno, dan setiap request masuk dibungkus dalam satu Context yang mengalir dari middleware ke route handler. Bekerja lewat Context alih-alih `Request` mentah membawa:

- **Parsing tertunda** - data diurai hanya saat sebuah method membacanya
- **Method nyaman** - API sederhana untuk operasi umum
- **Utilitas response** - method bawaan untuk mengirim response
- **Manajemen header** - perubahan header response yang mudah

## Kenapa Context?

Context menghindari parsing dan pemrosesan ulang berulang selama siklus hidup request, karena handler menerima satu objek Context yang bertahan sepanjang jalan dari middleware ke route handler.

## Membuat Context

Deserve membuat Context otomatis ketika request tiba:

```typescript twoslash
import type { Context } from '@neabyte/deserve'

// Deserve membangun ctx tiap request
export function GET(ctx: Context): Response {
  return ctx.send.json({
    message: 'Hello'
  })
}
```

## Struktur Context

Context membungkus beberapa bagian kunci:

1. **Request Asli** - akses lewat `ctx.request`
2. **URL Terurai** - dipakai internal untuk query param
3. **Parameter Rute** - diekstrak dari rute dinamis
4. **Header Response** - diatur sebelum mengirim response

## Parsing Tertunda

Context menunda parsing demi performa, jadi data query, body, cookie, dan header dibaca hanya saat method yang cocok berjalan, dan hasilnya di-cache untuk panggilan berikutnya. Membaca body bersifat async, jadi handler yang me-await-nya menjadi `async` dan mengembalikan `Promise<Response>`:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export async function GET(ctx: Context): Promise<Response> {
  // Query diurai pada baca pertama
  const query = ctx.query()
  // Panggilan ulang pakai cache

  // Body diurai berdasarkan Content-Type
  const body = await ctx.body()

  // Kembalikan query dan body bersama
  return ctx.send.json({
    query,
    body
  })
}
```

## Akses Data Request

Data request dijangkau lewat method Context, di mana query, params, header, dan cookie bersifat sinkron sementara pembaca body bersifat async:

- **Parameter Query** - `ctx.query()`, `ctx.queries()`
- **Parameter Rute** - `ctx.param()`, `ctx.params()`
- **Header** - `ctx.header()`, `ctx.headers`
- **Cookie** - `ctx.cookie()`
- **Body (async)** - `await ctx.body()`, `await ctx.json()`, `await ctx.formData()`, `await ctx.text()`, `await ctx.arrayBuffer()`, `await ctx.blob()`
- **Info URL** - `ctx.url`, `ctx.pathname`
- **IP Klien** - `ctx.ip`, `ctx.directIp`

## Utilitas Response

Kirim response memakai `ctx.send`, dengan satu method per jenis response:

- [`ctx.send.json()`](/id/response/json) - response JSON
- [`ctx.send.text()`](/id/response/text) - teks polos
- [`ctx.send.html()`](/id/response/html) - konten HTML
- [`ctx.send.file()`](/id/response/file) - unduhan berkas
- [`ctx.send.data()`](/id/response/data) - unduhan data dalam memori
- [`ctx.send.stream()`](/id/response/stream) - response stream (ReadableStream)
- [`ctx.send.redirect()`](/id/response/redirect) - pengalihan
- [`ctx.send.custom()`](/id/response/custom) - response khusus
- `ctx.handleError()` - alihkan kegagalan lewat [penanganan error](/id/error-handling/object-details)

Pintasan `ctx.redirect()` memetakan langsung ke `ctx.send.redirect()`:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Pintasan untuk ctx.send.redirect
  return ctx.redirect('/new-location', 301)
}
```

## Header Response

Atur header response sebelum mengirim:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  ctx.setHeader('X-Custom', 'value')
  ctx.setHeader('Cache-Control', 'no-cache')
  return ctx.send.json({
    data: 'test'
  })
}
```

### Mengatur Banyak Header

`setHeaders()` menerapkan beberapa header sekaligus:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  ctx.setHeaders({
    'X-Custom': 'value',
    'Cache-Control': 'no-cache',
    'X-Request-ID': 'abc123'
  })
  return ctx.send.json({
    data: 'test'
  })
}
```

### URL dan Pathname

Detail URL dibaca langsung dari Context:

- `ctx.url` - string URL lengkap
- `ctx.pathname` - bagian pathname dari URL, seperti `/api/users/123`

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  const fullUrl = ctx.url // 'http://localhost:8000/api/users/123?sort=name'
  const path = ctx.pathname // '/api/users/123'
  return ctx.send.json({
    path,
    fullUrl
  })
}
```

### IP Klien

IP klien dibaca dari Context, dan kedua nilai bernilai `undefined` ketika peer tidak diketahui:

- `ctx.ip` - IP klien yang diresolusi, menghormati [`trustProxy`](/id/getting-started/server-configuration#resolusi-ip-klien)
- `ctx.directIp` - peer TCP langsung, abaikan header forwarded

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  const client = ctx.ip // IP pengunjung asli
  const peer = ctx.directIp // IP koneksi langsung
  return ctx.send.json({
    client,
    peer
  })
}
```

## Berbagi State

Context membawa state lingkup-request supaya middleware dan handler bisa mengoper nilai sepanjang rantai. `ctx.state` adalah objek polos yang dibagikan untuk seluruh request:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
router.use(async (ctx, next) => {
  // Lampirkan nilai untuk handler berikutnya
  ctx.state.requestId = crypto.randomUUID()
  return await next()
})

export function GET(ctx: Context): Response {
  // Baca apa yang disimpan middleware
  return ctx.send.json({
    id: ctx.state.requestId
  })
}
```

Untuk akses bertipe, `setState` dan `getState` memakai sebuah kunci dan tipe nilai:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// Simpan nilai bertipe
ctx.setState<string>('userId' as never, '123')

// Baca kembali dengan tipe yang sama
const userId = ctx.getState<string>('userId' as never)
```

`as never` pada kunci disengaja, bukan trik untuk disalin begitu saja. Kunci state adalah tipe bermerek, jadi framework bisa mencadangkan beberapa nama untuk kebutuhan internalnya sendiri dan menolaknya saat kompilasi. String polos tidak membawa merek itu, dan `as never` itulah yang memberi tahu sistem tipe bahwa string ini adalah kunci yang valid. Tipe nilai tetap nyata dan terperiksa, jadi `getState<string>(...)` tetap mengembalikan `string | undefined`.

Beberapa kunci dicadangkan untuk kebutuhan internal framework dan hanya bisa dibaca lewat `getState`. Memanggil `setState` pada salah satunya melempar error 500. Kunci yang dicadangkan adalah `view`, `worker`, `session`, `setSession`, dan `clearSession`. [Worker pool](/id/core-concepts/worker-pool) dan [middleware session](/id/middleware/session) membaca handle-nya dengan cara ini.

## Merender Template

Ketika router punya `viewsDir`, Context bisa merender template DVE langsung:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export async function GET(ctx: Context): Promise<Response> {
  // Render template ke response HTML
  return await ctx.render(
    'home.dve',
    {
      title: 'Welcome'
    }
  )
}
```

`ctx.streamRender()` men-stream keluaran yang sama untuk halaman besar. Keduanya melempar ketika tidak ada `viewsDir` yang dikonfigurasi. Lihat [Sintaks Template](/id/rendering/syntax) untuk tata bahasa template dan [Streaming Rendering](/id/rendering/streaming) untuk jalur streaming.

## Penanganan Error

`ctx.handleError()` membangun response error dan bersifat async, jadi handler yang memanggilnya menjadi `async` dan me-await hasilnya:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const isAuthorized: boolean
// ---cut---
export async function GET(ctx: Context): Promise<Response> {
  try {
    if (!isAuthorized) {
      return await ctx.handleError(401, new Error('Unauthorized'))
    }
    return ctx.send.json({
      data: 'success'
    })
  } catch (error) {
    return await ctx.handleError(500, error as Error)
  }
}
```

### Cara Kerja

`ctx.handleError()` menghormati error handler global yang diatur dengan `router.catch()`:

- **Ketika `router.catch()` didefinisikan** - error handler khusus berjalan
- **Ketika tidak ada error handler** - response sederhana membawa status code

### Pakai di Middleware

Middleware bisa memanggil `ctx.handleError()` untuk memicu penanganan error:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
declare const isValid: boolean
// ---cut---
router.use(async (ctx, next) => {
  if (!isValid) {
    // Ini dialihkan lewat router.catch() saat didefinisikan
    return await ctx.handleError(401, new Error('Unauthorized'))
  }
  return await next()
})
```

## Siklus Hidup Context

1. **Request tiba** - Deserve membuat Context dengan Request dan URL
2. **Pencocokan rute** - parameter rute diekstrak dan ditambahkan ke Context
3. **Eksekusi middleware** - Context melewati rantai middleware
4. **Route handler** - handler menerima Context
5. **Response dikirim** - method Context membangun Response
