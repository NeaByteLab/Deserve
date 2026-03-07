# Middleware Basic Auth

> **Referensi**: [MDN HTTP Authentication Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Authentication)

Middleware HTTP Basic Authentication untuk melindungi route dengan autentikasi username dan password. Sederhana, aman, dan mudah dikonfigurasi.

## Penggunaan Dasar

Lindungi route dengan Basic Auth menggunakan `Mware.basicAuth()`:

```typescript
// 1. Import Router dan Mware
import { Router, Mware } from '@neabyte/deserve'

// 2. Buat router
const router = new Router()

// 3. Pasang Basic Auth dengan daftar user (username + password)
router.use(
  Mware.basicAuth({
    users: [
      { username: 'admin', password: 'secret' },
      { username: 'user', password: 'pass' }
    ]
  })
)

// 4. Jalankan server
await router.serve(8000)
```

## Proteksi Route Spesifik

Terapkan Basic Auth hanya pada route tertentu:

```typescript
// 1. Basic Auth hanya untuk path /api
router.use(
  '/api',
  Mware.basicAuth({
    users: [{ username: 'admin', password: 'secret' }]
  })
)

// 2. Path /admin dengan user berbeda
router.use(
  '/admin',
  Mware.basicAuth({
    users: [{ username: 'admin', password: 'admin123' }]
  })
)
```

## Beberapa Pengguna

Mendukung beberapa akun pengguna:

```typescript
// 1. Array users: tiap item { username, password }
router.use(
  Mware.basicAuth({
    users: [
      { username: 'admin', password: 'admin123' },
      { username: 'user', password: 'user123' },
      { username: 'guest', password: 'guest123' }
    ]
  })
)
```

## Penanganan Error

Basic Auth secara otomatis menggunakan `router.catch()` jika didefinisikan:

```typescript
// 1. Tangkap 401 (unauthorized) dari Basic Auth
router.catch((ctx, { statusCode, error }) => {
  if (statusCode === 401) {
    return ctx.send.json(
      { error: 'Autentikasi diperlukan', message: error?.message ?? 'Unauthorized' },
      { status: 401 }
    )
  }
  return ctx.send.json({
    error: error?.message ?? 'Error tidak diketahui'
  }, { status: statusCode })
})

// 2. Pasang Basic Auth (401 akan masuk router.catch)
router.use(Mware.basicAuth({ users: [...] }))
```

## Autentikasi Di Browser

Browser akan secara otomatis meminta kredensial saat mengakses route yang dilindungi:

```
Username: admin
Password: ******
```
