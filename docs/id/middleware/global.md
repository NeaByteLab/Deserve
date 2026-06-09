---
description: "Daftarkan middleware global yang berjalan untuk setiap request dengan router.use()."
---

# Global Middleware

Middleware global dieksekusi untuk setiap request sebelum route handler, menyediakan fungsionalitas lintas-potong seperti autentikasi, logging, dan CORS.

## Penggunaan Dasar

Tambahkan middleware global memakai method `use()`:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()

// Catat setiap request, lalu lanjut
router.use(async (ctx, next) => {
  console.log(`${ctx.request.method} ${ctx.url}`)
  return await next()
})

await router.serve(8000)
```

## Signature Fungsi Middleware

```typescript
type MiddlewareFn = (
  ctx: Context,
  next: () => Promise<Response | undefined>
) => Response | undefined | Promise<Response | undefined>
```

- **Kembalikan `await next()`** - lanjut ke middleware atau route handler berikutnya, yang memungkinkan modifikasi dan inspeksi response.
- **Kembalikan `Response`** - hentikan pemrosesan dan kembalikan response itu seketika.
- **Kembalikan `undefined`** - diperlakukan sebagai pass-through jadi rantai lanjut seolah `next()` dipanggil.

Middleware harus memanggil `next()` dan memakai hasilnya atau mengembalikan sebuah `Response`. Ketika tidak melakukan keduanya, misalnya tidak pernah memanggil `next()` dan tidak mengembalikan apa pun, request bisa menggantung, jadi `requestTimeoutMs` di `Router` membatasi durasi request dan mengembalikan 503.

## Pola Middleware Global Umum

### Logging Request

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
router.use(async (ctx, next) => {
  const start = Date.now()
  console.log(`${ctx.request.method} ${ctx.url} - ${new Date().toISOString()}`)
  const response = await next()
  const duration = Date.now() - start
  console.log(`Completed in ${duration}ms`)
  return response
})
```

### Autentikasi

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
declare function isValidToken(token: string): boolean
// ---cut---
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
  return await next()
})
```

## Membungkus Middleware Dengan Penanganan Error

Middleware kustom yang melempar bisa dibungkus dengan `WrapMware`, jadi error ditangkap dan diteruskan ke `router.catch()` ketika didefinisikan:

```typescript twoslash
import { Router, WrapMware } from '@neabyte/deserve'

const router = new Router()

// Bungkus supaya lemparan sampai ke router.catch
const myAuth = WrapMware('Auth', async (ctx, next) => {
  if (!ctx.header('x-api-key')) {
    throw new Error('Missing API key')
  }
  return await next()
})

// Terapkan middleware dan error handler
router.use(myAuth)
router.catch((ctx, err) => ctx.send.json({ error: err.error?.message }, { status: 500 }))

await router.serve(8000)
```

**Signature:** `WrapMware(label: string, middleware: MiddlewareFn): MiddlewareFn`. Ketika middleware melempar, error berjalan lewat `ctx.handleError()` sehingga `router.catch()` dipanggil.

## Middleware Per Path

Middleware juga berlaku untuk path spesifik:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
import { Router } from '@neabyte/deserve'

const router = new Router()
declare function isAuthenticated(ctx: Context): boolean
// ---cut---
// Berjalan hanya untuk path /api
router.use('/api', async (ctx, next) => {
  console.log('API request:', ctx.url)
  return await next()
})

// Jaga path /admin dengan cek auth
router.use('/admin', async (ctx, next) => {
  if (!isAuthenticated(ctx)) {
    return ctx.send.text('Unauthorized', { status: 401 })
  }
  return await next()
})
```
