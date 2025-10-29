# Middleware Spesifik Rute

Middleware spesifik rute diterapkan ke pola rute spesifik, memungkinkan fungsi bertarget seperti autentikasi untuk API routes atau logging untuk admin routes.

## Penggunaan Dasar

Terapkan middleware ke pola rute spesifik menggunakan method `use()` dengan path rute:

```typescript
import { Router } from '@neabyte/deserve'

const router = new Router()

// Middleware spesifik rute untuk /api/* routes
router.use('/api', async (ctx, next) => {
  console.log(`API request: ${ctx.request.method} ${ctx.url}`)
})

await router.serve(8000)
```

## Pencocokan Pola Rute

Middleware berlaku untuk routes yang dimulai dengan pola yang ditentukan:

```typescript
// Berlaku untuk /api/* routes
router.use('/api', middleware)

// Berlaku untuk /api/users/* routes
router.use('/api/users', middleware)

// Berlaku untuk /admin/* routes
router.use('/admin', middleware)
```

## Pola Route-Specific Umum

### API Authentication
```typescript
// Memerlukan autentikasi untuk semua API routes
router.use('/api', async (ctx, next) => {
  const authHeader = ctx.header('authorization')
  if (!authHeader) {
    return ctx.send.text('API requires authentication', { status: 401 })
  }
  // Validasi token
  const token = authHeader.replace('Bearer ', '')
  if (!isValidToken(token)) {
    return ctx.send.text('Invalid token', { status: 401 })
  }
  // Context tidak dimodifikasi, Handler otomatis memanggil next()
})
```

### Admin Authorization
```typescript
// Memerlukan peran admin untuk admin routes
router.use('/admin', async (ctx, next) => {
  const userRole = ctx.header('x-user-role')
  if (userRole !== 'admin') {
    return ctx.send.text('Admin access required', { status: 403 })
  }
  // Context tidak dimodifikasi, Handler otomatis memanggil next()
})
```

### Public Route Logging
```typescript
// Log semua akses route publik
router.use('/public', async (ctx, next) => {
  console.log(`Public access: ${ctx.request.method} ${ctx.url}`)
})
```

### Version-Specific Middleware
```typescript
// Middleware berbeda untuk versi API
router.use('/api/v1', async (ctx, next) => {
  // Perilaku API legacy
  console.log('Legacy API v1 request')
})

router.use('/api/v2', async (ctx, next) => {
  // Perilaku API modern
  console.log('Modern API v2 request')
})
```

## Multiple Route-Specific Middleware

Terapkan beberapa middleware ke pola rute yang sama:

```typescript
// Authentication middleware untuk API routes
router.use('/api', async (ctx, next) => {
  const authHeader = ctx.header('authorization')
  if (!authHeader) {
    return ctx.send.text('Unauthorized', { status: 401 })
  }
})

// Logging middleware untuk API routes
router.use('/api', async (ctx, next) => {
  console.log(`API: ${ctx.request.method} ${ctx.url}`)
})
```

## Nested Route Patterns

Terapkan middleware ke pola rute bersarang:

```typescript
// Middleware API umum
router.use('/api', async (ctx, next) => {
  console.log('API request')
})

// Middleware spesifik untuk user routes
router.use('/api/users', async (ctx, next) => {
  console.log('User API request')
})

// Middleware spesifik admin untuk manajemen user
router.use('/api/users/admin', async (ctx, next) => {
  const role = ctx.header('x-user-role')
  if (role !== 'admin') {
    return ctx.send.text('Admin access required', { status: 403 })
  }
})
```

## Urutan Eksekusi Middleware

Middleware dieksekusi sesuai urutan penambahannya:

```typescript
// Global middleware ditambahkan pertama
router.use(async (ctx, next) => {
  console.log('Global middleware')
})

// Route-specific middleware ditambahkan kedua
router.use('/api', async (ctx, next) => {
  console.log('API middleware')
})

// Urutan eksekusi untuk /api/users:
// 1. Global middleware (ditambahkan pertama)
// 2. API middleware (route-specific, ditambahkan kedua)
// 3. Route handler
```

