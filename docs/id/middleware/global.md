---
description: "Daftarkan middleware global yang berjalan untuk setiap request dengan router.use()."
---

# Global Middleware

Middleware global dieksekusi untuk setiap request sebelum route handler, menyediakan fungsi lintas-rute seperti autentikasi, logging, dan CORS.

Setiap pemanggilan `router.use(fn)` menambahkan entry dengan path kosong, jadi cocok untuk setiap request dan berjalan persis dalam urutan pendaftarannya, sebelum route matching terjadi.

![Pendaftaran dan posisi Global Middleware: tiap router.use(fn) menambahkan entry path-kosong yang cocok untuk setiap request dan berjalan sebelum route matching, dalam urutan pendaftaran](/diagrams/middleware-global-registration.png)

## Penggunaan Dasar

Tambahkan middleware global memakai method `use()`:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()

// Catat setiap request, lalu lanjut
router.use(async (ctx, next) => {
  console.log(`${ctx.get.method()} ${ctx.get.url().href}`)
  return await next()
})

await router.serve(8000)
```

## Signature Fungsi Middleware

```typescript
type MiddlewareFn = (
  ctx: Context,
  next: () => Promise<Response | undefined>
) => Promise<Response | undefined>
```

- **Kembalikan `await next()`** - lanjut ke middleware atau route handler berikutnya, yang memungkinkan modifikasi dan inspeksi response
- **Kembalikan `Response`** - hentikan pemrosesan dan kembalikan response itu seketika
- **Kembalikan `undefined`** - diperlakukan sebagai pass-through jadi rantai lanjut seolah `next()` dipanggil

Middleware harus memanggil `next()` dan memakai hasilnya atau mengembalikan sebuah `Response`. Ketika tidak melakukan keduanya, misalnya tidak pernah memanggil `next()` dan tidak mengembalikan apa pun, request bisa menggantung, jadi `timeoutMs` di `Router` membatasi durasi request dan mengembalikan 503.

![Alur kontrol per-request Global Middleware: kembalikan await next() melanjutkan rantai, mengembalikan Response berhenti dan melewati handler, mengembalikan undefined adalah pass-through; melempar dialihkan ke router.catch atau 500, dan macet memicu penjaga 503 timeoutMs](/diagrams/middleware-global-flow.png)

## Pola Middleware Global Umum

### Logging Request

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
router.use(async (ctx, next) => {
  const start = Date.now()
  console.log(`${ctx.get.method()} ${ctx.get.url().href} - ${new Date().toISOString()}`)
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
  const authHeader = ctx.get.header('authorization')
  if (!authHeader) {
    return ctx.send.text('Unauthorized', { status: 401 })
  }
  // Validasi token di sini
  const token = authHeader.replace('Bearer ', '')
  if (!isValidToken(token)) {
    return ctx.send.text('Invalid token', { status: 401 })
  }
  return await next()
})
```

Untuk alur auth yang lebih bersih, lempar error dan biarkan [error handler terpusat](/id/error-handling/object-details) membentuk response alih-alih membangunnya inline.

## Membungkus Middleware Dengan Penanganan Error

Middleware kustom yang melempar bisa dibungkus dengan `Wrap.apply`, jadi error ditangkap dan diteruskan ke `router.catch()` ketika didefinisikan:

```typescript twoslash
import { Router, Wrap, type HttpStatusCode } from '@neabyte/deserve'

const router = new Router()

// Bungkus supaya lemparan sampai ke router.catch
const myAuth = Wrap.apply('Auth', async (ctx, next) => {
  // Baca API key dari header
  if (!ctx.get.header('x-api-key')) {
    throw new Error('Missing API key')
  }
  return await next()
})

// Terapkan middleware dan error handler
router.use(myAuth)
router.catch((ctx, info) => {
  return ctx.send.json(
    { error: info.error.message },
    { status: info.statusCode as HttpStatusCode }
  )
})

await router.serve(8000)
```

**Signature:** `Wrap.apply(label: string, middleware: MiddlewareFn): MiddlewareFn`. Ketika middleware melempar, error berjalan lewat `ctx.handleError()` sehingga `router.catch()` dipanggil. Setiap middleware bawaan di [Mware](/id/middleware/basic-auth) sudah dibungkus dengan cara ini, jadi lemparan di dalamnya membawa label middleware langsung ke error handler.

## Middleware Per Path

Middleware juga berlaku untuk path spesifik, dibahas lengkap di [Route-Specific Middleware](/id/middleware/route-specific):

```typescript twoslash
import { Router, type Context } from '@neabyte/deserve'

const router = new Router()
declare function isAuthenticated(ctx: Context): boolean
// ---cut---
// Berjalan hanya untuk path /api
router.use('/api', async (ctx, next) => {
  console.log('API request:', ctx.get.pathname())
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
