# Objek Konteks

Objek `Context` membungkus `Request` native dan menyediakan method yang nyaman untuk mengakses data request, mengatur response header, dan mengirim response.

## Apa itu Context?

Context adalah wrapper di sekitar objek `Request` native Deno. Alih-alih bekerja langsung dengan `Request` mentah, Anda menggunakan `Context` yang memberi Anda:

- **Lazy parsing** - Data di-parse hanya saat Anda mengaksesnya
- **Method yang nyaman** - API sederhana untuk operasi umum
- **Utility response** - Method built-in untuk mengirim response
- **Manajemen header** - Manipulasi response header yang mudah

## Mengapa Menggunakan Context?

Context menghindari multiple parsing dan pemrosesan berulang selama lifecycle request. Handler menerima satu objek Context yang bertahan melalui seluruh lifecycle — dari middleware ke route handler.

## Membuat Context

Deserve membuat Context secara otomatis saat request datang:

```typescript
import type { Context } from '@neabyte/deserve'

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

Context menggunakan lazy parsing untuk performa:

```typescript
export function GET(ctx: Context): Response {
  // Query params belum di-parse

  const query = ctx.query() // Di-parse pada akses pertama
  // Sekarang di-cache, panggilan selanjutnya mengembalikan nilai cache

  const body = await ctx.body() // Di-parse pada akses pertama
  // Di-parse berdasarkan Content-Type

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
- `ctx.send.redirect()` - Redirect
- `ctx.send.custom()` - Response custom

Anda juga dapat menggunakan `ctx.redirect()` secara langsung sebagai method convenience:

```typescript
export function GET(ctx: Context): Response {
  return ctx.redirect('/new-location', 301)
  // Setara dengan: ctx.send.redirect('/new-location', 301)
}
```

## Response Headers

Atur response header sebelum mengirim:

```typescript
export function GET(ctx: Context): Response {
  ctx.setHeader('X-Custom', 'value')
  ctx.setHeader('Cache-Control', 'no-cache')
  return ctx.send.json({ data: 'test' })
}
```

### Mengatur Multiple Headers

Gunakan `setHeaders()` untuk mengatur multiple headers sekaligus:

```typescript
export function GET(ctx: Context): Response {
  ctx.setHeaders({
    'X-Custom': 'value',
    'Cache-Control': 'no-cache',
    'X-Request-ID': 'abc123'
  })
  return ctx.send.json({ data: 'test' })
}
```

### Membaca Response Headers

Akses semua response headers yang telah diatur:

```typescript
export function GET(ctx: Context): Response {
  ctx.setHeader('X-Custom', 'value')
  ctx.setHeader('Cache-Control', 'no-cache')
  const headers = ctx.responseHeadersMap // { 'X-Custom': 'value', 'Cache-Control': 'no-cache' }
  return ctx.send.json({ data: 'test' })
}
```

### URL dan Pathname

Dapatkan informasi URL langsung:

- `ctx.url` - String URL lengkap
- `ctx.pathname` - Bagian pathname dari URL (contoh: `/api/users/123`)

```typescript
export function GET(ctx: Context): Response {
  const fullUrl = ctx.url // 'http://localhost:8000/api/users/123?sort=name'
  const path = ctx.pathname // '/api/users/123'
  return ctx.send.json({ path, fullUrl })
}
```

## Lifecycle Context

1. **Request datang** - Deserve membuat Context dengan Request dan URL
2. **Route matching** - Route parameters diekstrak dan ditambahkan ke Context
3. **Eksekusi middleware** - Context dilewatkan melalui middleware chain
4. **Route handler** - Handler Anda menerima Context
5. **Response dikirim** - Method Context digunakan untuk membangun Response

