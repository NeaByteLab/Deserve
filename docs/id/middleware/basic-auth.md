# Middleware Basic Auth

> **Referensi**: [MDN HTTP Authentication Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Authentication)

Middleware HTTP Basic Authentication untuk melindungi route dengan autentikasi username dan password. Sederhana, aman, dan mudah dikonfigurasi.

## Penggunaan Dasar

Lindungi route dengan Basic Auth menggunakan `Mware.basicAuth()`:

```typescript
import { Router, Mware } from '@neabyte/deserve'

const router = new Router()

router.use(
  Mware.basicAuth({
    users: [
      { username: 'admin', password: 'secret' },
      { username: 'user', password: 'pass' }
    ]
  })
)

router.serve(8000)
```

## Proteksi Route-Spesifik

Terapkan Basic Auth hanya pada route tertentu:

```typescript
// Lindungi hanya route /api
router.use(
  '/api',
  Mware.basicAuth({
    users: [{ username: 'admin', password: 'secret' }]
  })
)

// Lindungi route admin dengan kredensial berbeda
router.use(
  '/admin',
  Mware.basicAuth({
    users: [{ username: 'admin', password: 'admin123' }]
  })
)
```

## Multiple Users

Mendukung beberapa akun pengguna:

```typescript
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

router.use(Mware.basicAuth({ users: [...] }))
```

## Autentikasi Browser

Browser akan secara otomatis meminta kredensial saat mengakses route yang dilindungi:

```
Username: admin
Password: ******
```

