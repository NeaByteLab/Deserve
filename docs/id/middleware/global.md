# Middleware Global

Middleware global dieksekusi untuk setiap request sebelum route handlers, menyediakan fungsi lintas seperti autentikasi, logging, dan CORS.

## Penggunaan Dasar

Tambahkan middleware global menggunakan method `use()`:

```typescript
// 1. Import Router
import { Router } from '@neabyte/deserve'

// 2. Buat router
const router = new Router()

// 3. Tambah middleware global: log tiap request, lalu lanjut
router.use(async (ctx, next) => {
  console.log(`${ctx.request.method} ${ctx.url}`)
  return await next()
})

// 4. Jalankan server
await router.serve(8000)
```

## Signature Fungsi Middleware

```typescript
type Middleware = (
  ctx: Context,
  next: () => Promise<Response | undefined>
) => Response | Promise<Response | undefined>
```

- **Return `await next()`** - Lanjut ke middleware atau route handler berikutnya; memungkinkan modifikasi dan inspeksi response.
- **Return `Response`** - Hentikan pemrosesan dan kembalikan response tersebut.
- **Return `undefined`** - Dianggap pass-through (rantai berlanjut seperti `next()` dipanggil).

Middleware harus memanggil `next()` dan memakai hasilnya atau mengembalikan `Response`. Jika tidak (mis. tidak pernah memanggil `next()` dan tidak return apa-apa), request bisa hang; gunakan `requestTimeoutMs` di `Router` untuk membatasi durasi request dan mendapat 503.

## Pola Middleware Global Umum

### Logging Request

```typescript
// 1. Catat waktu mulai
router.use(async (ctx, next) => {
  const start = Date.now()
  // 2. Log request masuk
  console.log(`🌐 ${ctx.request.method} ${ctx.url} - ${new Date().toISOString()}`)
  // 3. Jalankan middleware/route berikutnya
  const response = await next()
  // 4. Hitung durasi dan log selesai
  const duration = Date.now() - start
  console.log(`✅ Completed in ${duration}ms`)
  return response
})
```

### Autentikasi

```typescript
// 1. Cek header Authorization
router.use(async (ctx, next) => {
  const authHeader = ctx.header('authorization')
  if (!authHeader) {
    return ctx.send.text('Unauthorized', { status: 401 })
  }
  // 2. Ambil token (strip "Bearer ")
  const token = authHeader.replace('Bearer ', '')
  // 3. Validasi token; jika invalid → 401
  if (!isValidToken(token)) {
    return ctx.send.text('Invalid token', { status: 401 })
  }
  // 4. Valid → lanjut
  return await next()
})
```

## Membungkus Middleware Dengan Error Handling

Middleware custom yang melempar error bisa dibungkus dengan `wrapMiddleware` agar error tertangkap dan diteruskan ke `router.catch()` (jika ada):

```typescript
// 1. Import Router, wrapMiddleware (dan Mware jika perlu)
import { Router, wrapMiddleware, Mware } from '@neabyte/deserve'

// 2. Buat router
const router = new Router()

// 3. Bungkus middleware dengan label; error akan masuk ke router.catch
const myAuth = wrapMiddleware('Auth', async (ctx, next) => {
  if (!ctx.header('x-api-key')) {
    throw new Error('Missing API key')
  }
  return await next()
})

// 4. Pasang middleware dan error handler
router.use(myAuth)
router.catch((ctx, err) => ctx.send.json({ error: err.error?.message }, { status: 500 }))

// 5. Jalankan server
await router.serve(8000)
```

**Signature:** `wrapMiddleware(label: string, middleware: Middleware): Middleware`. Jika middleware melempar, error akan diproses lewat `ctx.handleError()` sehingga `router.catch()` dipanggil.

## Middleware Per Path

Anda dapat menerapkan middleware ke path spesifik:

```typescript
// 1. Middleware hanya untuk path yang diawali /api
router.use('/api', async (ctx, next) => {
  console.log('API request:', ctx.url)
  return await next()
})

// 2. Middleware untuk path /admin: cek auth dulu
router.use('/admin', async (ctx, next) => {
  if (!isAuthenticated(ctx)) {
    return ctx.send.text('Unauthorized', { status: 401 })
  }
  return await next()
})
```
