# Objek Konteks

Objek `Context` membungkus `Request` native dan menyediakan method yang nyaman untuk mengakses data request, mengatur response header, dan mengirim response.

## Apa Itu Context?

Context adalah wrapper di sekitar objek `Request` native Deno. Setiap request yang masuk akan dibungkus menjadi satu objek Context yang sama dari middleware hingga route handler. Alih-alih bekerja langsung dengan `Request` mentah, Anda menggunakan `Context` yang memberi Anda:

- **Lazy parsing** - Data di-parse hanya saat Anda mengaksesnya
- **Method yang nyaman** - API sederhana untuk operasi umum
- **Utility response** - Method built-in untuk mengirim response
- **Manajemen header** - Manipulasi response header yang mudah

## Mengapa Menggunakan Context?

Context menghindari multiple parsing dan pemrosesan berulang selama lifecycle request. Handler menerima satu objek Context yang bertahan melalui seluruh lifecycle — dari middleware ke route handler.

## Membuat Context

Deserve membuat Context secara otomatis saat request datang:

```typescript
// 1. Import tipe Context
import type { Context } from '@neabyte/deserve'

// 2. Handler menerima ctx (Deserve membuat otomatis per request)
export function GET(ctx: Context): Response {
  return ctx.send.json({ message: 'Hello' })
}
```

## Struktur Context

Context membungkus beberapa bagian kunci:

1. **Original Request** - Diakses via `ctx.request`
2. **Parsed URL** - Digunakan internal untuk query params
3. **Route Parameters** - Diekstrak dari dynamic routes
4. **Response Headers** - Diatur sebelum mengirim response

## Lazy Parsing

Context menggunakan lazy parsing untuk performa: data (query, body, cookie, header) hanya di-parse saat Anda memanggil method yang menggunakannya, lalu hasilnya di-cache untuk pemanggilan berikutnya.

```typescript
export function GET(ctx: Context): Response {
  // 1. Query belum di-parse sampai ctx.query() dipanggil
  const query = ctx.query()
  // 2. Hasil di-cache; panggilan berikutnya pakai cache

  // 3. Body di-parse pada akses pertama (berdasarkan Content-Type)
  const body = await ctx.body()

  // 4. Kirim gabungan query + body
  return ctx.send.json({ query, body })
}
```

## Akses Data Request

Akses data request melalui method Context:

- **Query Parameters** - `ctx.query()`, `ctx.queries()`
- **Route Parameters** - `ctx.param()`, `ctx.params()`
- **Headers** - `ctx.header()`, `ctx.headers`
- **Cookies** - `ctx.cookie()`
- **Body** - `ctx.body()`, `ctx.json()`, `ctx.formData()`, `ctx.text()`, `ctx.arrayBuffer()`, `ctx.blob()`
- **Informasi URL** - `ctx.url`, `ctx.pathname`

## Utility Response

Kirim response menggunakan `ctx.send`:

- `ctx.send.json()` - Response JSON
- `ctx.send.text()` - Plain text
- `ctx.send.html()` - Konten HTML
- `ctx.send.file()` - Unduhan file
- `ctx.send.data()` - Unduhan data in-memory
- `ctx.send.stream()` - Response stream (ReadableStream)
- `ctx.send.redirect()` - Redirect
- `ctx.send.custom()` - Response custom
- `ctx.handleError()` - Error handling

Anda juga dapat menggunakan `ctx.redirect()` secara langsung sebagai method convenience:

```typescript
export function GET(ctx: Context): Response {
  // 1. Redirect 301 ke path baru (shorthand untuk ctx.send.redirect)
  return ctx.redirect('/new-location', 301)
}
```

## Response Headers

Atur response header sebelum mengirim:

```typescript
export function GET(ctx: Context): Response {
  // 1. Atur header satu per satu
  ctx.setHeader('X-Custom', 'value')
  ctx.setHeader('Cache-Control', 'no-cache')
  // 2. Kirim response (header ikut terkirim)
  return ctx.send.json({ data: 'test' })
}
```

### Mengatur Banyak Header Sekaligus

Gunakan `setHeaders()` untuk mengatur multiple headers sekaligus:

```typescript
export function GET(ctx: Context): Response {
  // 1. Atur banyak header sekaligus (object)
  ctx.setHeaders({
    'X-Custom': 'value',
    'Cache-Control': 'no-cache',
    'X-Request-ID': 'abc123'
  })
  return ctx.send.json({ data: 'test' })
}
```

### Membaca Header Response

Akses semua response headers yang telah diatur:

```typescript
export function GET(ctx: Context): Response {
  // 1. Set header
  ctx.setHeader('X-Custom', 'value')
  ctx.setHeader('Cache-Control', 'no-cache')
  // 2. Baca map header yang sudah diatur
  const headers = ctx.responseHeadersMap
  return ctx.send.json({ data: 'test' })
}
```

### URL Dan Pathname

Dapatkan informasi URL langsung:

- `ctx.url` - String URL lengkap
- `ctx.pathname` - Bagian pathname dari URL (contoh: `/api/users/123`)

```typescript
export function GET(ctx: Context): Response {
  // 1. URL lengkap (termasuk query string)
  const fullUrl = ctx.url
  // 2. Hanya pathname (tanpa origin + query)
  const path = ctx.pathname
  return ctx.send.json({ path, fullUrl })
}
```

## Penanganan Error

Tangani error secara konsisten menggunakan `ctx.handleError()`:

```typescript
export function GET(ctx: Context): Response {
  try {
    // 1. Cek auth; jika gagal, trigger error handler (router.catch atau default)
    if (!isAuthorized) {
      return ctx.handleError(401, new Error('Unauthorized'))
    }
    return ctx.send.json({ data: 'success' })
  } catch (error) {
    // 2. Tangkap error lain → kirim ke error handler
    return ctx.handleError(500, error as Error)
  }
}
```

### Cara Kerja handleError

`ctx.handleError()` menghormati error handler global yang diatur dengan `router.catch()`:

- **Jika `router.catch()` didefinisikan** - Menggunakan error handler kustom Anda
- **Jika tidak ada error handler** - Mengembalikan response sederhana dengan status code

### Penggunaan Di Middleware

Middleware dapat menggunakan `ctx.handleError()` untuk memicu error handling:

```typescript
// 1. Di middleware, validasi request
router.use(async (ctx, next) => {
  if (!isValid) {
    // 2. Trigger error handling (router.catch dipanggil jika ada)
    return ctx.handleError(401, new Error('Unauthorized'))
  }
  return await next()
})
```

## Lifecycle Context

1. **Request datang** - Deserve membuat Context dengan Request dan URL
2. **Route matching** - Route parameters diekstrak dan ditambahkan ke Context
3. **Eksekusi middleware** - Context dilewatkan melalui middleware chain
4. **Route handler** - Handler Anda menerima Context
5. **Response dikirim** - Method Context digunakan untuk membangun Response
