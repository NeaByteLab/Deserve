# Middleware Global

Middleware global dieksekusi untuk setiap request sebelum route handlers, menyediakan fungsi lintas seperti autentikasi, logging, dan CORS.

## Penggunaan Dasar

Tambahkan middleware global menggunakan method `use()`:

```typescript
import { Router } from '@neabyte/deserve'

const router = new Router()

router.use(async (ctx, next) => {
  console.log(`${ctx.request.method} ${ctx.url}`)
  return await next() // Lanjut ke middleware/route berikutnya
})

router.serve(8000)
```

## Signature Fungsi Middleware

```typescript
type Middleware = (ctx: Context, next: () => Promise<Response>) => Response | Promise<Response>
```

- **Return `await next()`** - Selalu dipanggil untuk melanjutkan ke middleware atau route handler berikutnya, memungkinkan modifikasi dan inspeksi response
- **Return `Response`** - Hentikan pemrosesan dan kembalikan response segera
- **Return `undefined`** - Lewati middleware (otomatis memanggil `next()`)

## Pola Middleware Global Umum

### Request Logging
```typescript
router.use(async (ctx, next) => {
  const start = Date.now()
  console.log(`🌐 ${ctx.request.method} ${ctx.url} - ${new Date().toISOString()}`)
  const response = await next()
  const duration = Date.now() - start
  console.log(`✅ Completed in ${duration}ms`)
  return response
})
```

### Authentication
```typescript
router.use(async (ctx, next) => {
  const authHeader = ctx.header('authorization')
  if (!authHeader) {
    return ctx.send.text('Unauthorized', { status: 401 })
  }
  // Validasi token di sini...
  const token = authHeader.replace('Bearer ', '')
  if (!isValidToken(token)) {
    return ctx.send.text('Invalid token', { status: 401 })
  }
  // Context tidak dimodifikasi, Handler otomatis memanggil next()
})
```

## Path-Specific Middleware

Anda dapat menerapkan middleware ke path spesifik:

```typescript
// Middleware hanya untuk /api routes
router.use('/api', async (ctx, next) => {
  console.log('API request:', ctx.url)
})

// Middleware untuk semua routes yang dimulai dengan /admin
router.use('/admin', async (ctx, next) => {
  if (!isAuthenticated(ctx)) {
    return ctx.send.text('Unauthorized', { status: 401 })
  }
})
```

