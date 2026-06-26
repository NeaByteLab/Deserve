---
description: "Batasi cakupan middleware ke prefix path supaya hanya berjalan untuk rute yang cocok."
---

# Middleware Spesifik Rute

Middleware spesifik rute berlaku untuk pola rute tertentu, memungkinkan fungsi yang menyasar rute tertentu seperti autentikasi untuk rute API atau logging untuk rute admin.

Pencocokan sadar batas: `router.use('/api', fn)` berjalan untuk `/api` dan `/api/users`, tapi tidak untuk `/apiv2`, karena pathname harus sama dengan prefix atau dilanjut dengan `/`.

![Pencocokan prefix Route-Specific: router.use('/api', fn) cocok dengan /api persis dan /api/users pada slash batas, tapi melewati /apiv2 dan /admin karena bukan kecocokan batas dari prefix](/diagrams/middleware-route-matching.png)

## Penggunaan Dasar

Terapkan middleware ke pola rute tertentu memakai method `use()` dengan path rute:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()

// Berjalan untuk path yang diawali /api
router.use('/api', async (ctx, next) => {
  console.log(`API request: ${ctx.get.method()} ${ctx.get.pathname()}`)
  return await next()
})

await router.serve(8000)
```

## Pencocokan Pola Rute

Middleware berlaku untuk rute yang diawali pola yang ditentukan:

```typescript twoslash
import { Router, type MiddlewareFn } from '@neabyte/deserve'

const router = new Router()
declare const middleware: MiddlewareFn
// ---cut---
// Berlaku untuk rute /api/*
router.use('/api', middleware)

// Berlaku untuk rute /api/users/*
router.use('/api/users', middleware)

// Berlaku untuk rute /admin/*
router.use('/admin', middleware)
```

## Pola Spesifik Rute Umum

### Autentikasi API

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
declare function isValidToken(token: string): boolean
// ---cut---
// Wajibkan bearer token di bawah /api
router.use('/api', async (ctx, next) => {
  const authHeader = ctx.get.header('authorization')
  if (!authHeader) {
    return ctx.send.text('API requires authentication', { status: 401 })
  }
  const token = authHeader.replace('Bearer ', '')
  if (!isValidToken(token)) {
    return ctx.send.text('Invalid token', { status: 401 })
  }
  return await next()
})
```

### Otorisasi Admin

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Izinkan hanya peran admin di bawah /admin
router.use('/admin', async (ctx, next) => {
  const userRole = ctx.get.header('x-user-role')
  if (userRole !== 'admin') {
    return ctx.send.text('Admin access required', { status: 403 })
  }
  return await next()
})
```

### Logging Rute Publik

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Catat akses di bawah /public
router.use('/public', async (ctx, next) => {
  console.log(`Public access: ${ctx.get.method()} ${ctx.get.pathname()}`)
  return await next()
})
```

### Middleware Spesifik Versi

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Middleware terpisah per versi API
router.use('/api/v1', async (ctx, next) => {
  console.log('Legacy API v1 request')
  return await next()
})

router.use('/api/v2', async (ctx, next) => {
  console.log('Modern API v2 request')
  return await next()
})
```

## Banyak Middleware Spesifik Rute

Terapkan beberapa middleware ke pola rute yang sama:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Auth berjalan lebih dulu di bawah /api
router.use('/api', async (ctx, next) => {
  const authHeader = ctx.get.header('authorization')
  if (!authHeader) {
    return ctx.send.text('Unauthorized', { status: 401 })
  }
  return await next()
})

// Logging berjalan setelah auth lolos
router.use('/api', async (ctx, next) => {
  console.log(`API: ${ctx.get.method()} ${ctx.get.pathname()}`)
  return await next()
})
```

## Pola Rute Bersarang

Terapkan middleware ke pola rute bersarang:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Mencakup setiap path di bawah /api
router.use('/api', async (ctx, next) => {
  console.log('API request')
  return await next()
})

// Mempersempit ke /api/users
router.use('/api/users', async (ctx, next) => {
  console.log('User API request')
  return await next()
})

// Mempersempit lagi dan cek peran
router.use('/api/users/admin', async (ctx, next) => {
  const role = ctx.get.header('x-user-role')
  if (role !== 'admin') {
    return ctx.send.text('Admin access required', { status: 403 })
  }
  return await next()
})
```

## Urutan Eksekusi Middleware

Middleware berjalan sesuai urutan penambahannya:

![Eksekusi Route-Specific untuk GET /api/users dalam satu rantai: logger global berjalan, auth /api berjalan pada kecocokan prefix, penjaga /admin dilewati karena tidak cocok tanpa memakai giliran, logger /api/users berjalan, lalu route handler dieksekusi, semua dalam urutan pendaftaran](/diagrams/middleware-route-chain.png)

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Global berjalan untuk setiap request
router.use(async (ctx, next) => {
  console.log('Global middleware')
  return await next()
})

// Middleware path berjalan untuk request /api
router.use('/api', async (ctx, next) => {
  console.log('API middleware')
  return await next()
})

// Untuk /api/users: global, lalu API, lalu handler
```
