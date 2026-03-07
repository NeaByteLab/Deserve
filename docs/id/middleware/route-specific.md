# Middleware Spesifik Rute

Middleware spesifik rute diterapkan hanya ke request yang path-nya diawali dengan string yang Anda berikan (prefix match). Misalnya `router.use('/api', mw)` menjalankan `mw` untuk `/api`, `/api/users`, `/api/v1`, dan seterusnya. memungkinkan fungsi bertarget seperti autentikasi untuk API routes atau logging untuk admin routes.

## Penggunaan Dasar

Terapkan middleware ke pola rute spesifik menggunakan method `use()` dengan path rute:

```typescript
// 1. Import Router
import { Router } from '@neabyte/deserve'

// 2. Buat router
const router = new Router()

// 3. Pasang middleware untuk path yang diawali /api (prefix match)
router.use('/api', async (ctx, next) => {
  console.log(`API request: ${ctx.request.method} ${ctx.url}`)
  return await next()
})

// 4. Jalankan server
await router.serve(8000)
```

## Pencocokan Pola Rute

Middleware berlaku untuk routes yang dimulai dengan pola yang ditentukan:

```typescript
// 1. Prefix path = scope middleware (prefix match)
router.use('/api', middleware)
router.use('/api/users', middleware)
router.use('/admin', middleware)
```

## Pola Umum Middleware Per Rute

### Autentikasi API

```typescript
// 1. Auth hanya untuk /api
router.use('/api', async (ctx, next) => {
  const authHeader = ctx.header('authorization')
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

```typescript
// 1. Cek role admin untuk /admin
router.use('/admin', async (ctx, next) => {
  const userRole = ctx.header('x-user-role')
  if (userRole !== 'admin') {
    return ctx.send.text('Admin access required', { status: 403 })
  }
  return await next()
})
```

### Logging Rute Publik

```typescript
// 1. Log akses ke /public
router.use('/public', async (ctx, next) => {
  console.log(`Public access: ${ctx.request.method} ${ctx.url}`)
  return await next()
})
```

### Middleware Per Versi

```typescript
// 1. Middleware per versi API
router.use('/api/v1', async (ctx, next) => {
  console.log('Legacy API v1 request')
  return await next()
})

router.use('/api/v2', async (ctx, next) => {
  console.log('Modern API v2 request')
  return await next()
})
```

## Beberapa Middleware Untuk Path Yang Sama

Terapkan beberapa middleware ke pola rute yang sama:

```typescript
// 1. Auth dulu untuk /api
router.use('/api', async (ctx, next) => {
  const authHeader = ctx.header('authorization')
  if (!authHeader) {
    return ctx.send.text('Unauthorized', { status: 401 })
  }
  return await next()
})

// 2. Lalu logging (jalan setelah auth ok)
router.use('/api', async (ctx, next) => {
  console.log(`API: ${ctx.request.method} ${ctx.url}`)
  return await next()
})
```

## Pola Rute Bersarang

Terapkan middleware ke pola rute bersarang:

```typescript
// 1. /api → semua path di bawah /api
router.use('/api', async (ctx, next) => {
  console.log('API request')
  return await next()
})

// 2. /api/users → lebih spesifik
router.use('/api/users', async (ctx, next) => {
  console.log('User API request')
  return await next()
})

// 3. /api/users/admin → cek role
router.use('/api/users/admin', async (ctx, next) => {
  const role = ctx.header('x-user-role')
  if (role !== 'admin') {
    return ctx.send.text('Admin access required', { status: 403 })
  }
  return await next()
})
```

## Urutan Eksekusi Middleware

Middleware dieksekusi sesuai urutan penambahannya:

```typescript
// 1. Global: jalan untuk semua request
router.use(async (ctx, next) => {
  console.log('Global middleware')
  return await next()
})

// 2. Path /api: jalan jika path diawali /api
router.use('/api', async (ctx, next) => {
  console.log('API middleware')
  return await next()
})

// Urutan eksekusi untuk request ke /api/users:
// 1. Global middleware (ditambahkan pertama)
// 2. API middleware (route-specific, ditambahkan kedua)
// 3. Route handler
```
