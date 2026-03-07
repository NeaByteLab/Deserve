# Middleware Body Limit

> **Referensi**: [RFC 7230 HTTP/1.1 Message Syntax and Routing](https://datatracker.ietf.org/doc/html/rfc7230#section-3.3.1)

Middleware Body Limit menegakkan ukuran body request maksimum dengan memeriksa header `Content-Length`. Mencegah payload besar yang dapat membebani server Anda.

## Penggunaan Dasar

Terapkan middleware body limit menggunakan middleware built-in Deserve:

```typescript
// 1. Import Router dan Mware
import { Router, Mware } from '@neabyte/deserve'

// 2. Buat router
const router = new Router()

// 3. Batasi body request maks 1MB; jika lebih → 413
router.use(
  Mware.bodyLimit({
    limit: 1024 * 1024
  })
)

// 4. Jalankan server
await router.serve(8000)
```

## Limit Per Rute

Terapkan limit body berbeda pada route tertentu:

```typescript
// 1. Global: max 1MB
router.use(Mware.bodyLimit({ limit: 1024 * 1024 }))

// 2. Hanya /uploads: max 5MB
router.use('/uploads', Mware.bodyLimit({ limit: 5 * 1024 * 1024 }))

// 3. Hanya /api: max 10MB
router.use('/api', Mware.bodyLimit({ limit: 10 * 1024 * 1024 }))
```

## Opsi Konfigurasi

### `limit`

Ukuran body maksimum dalam bytes:

```typescript
// 1MB (1,048,576 bytes)
limit: 1024 * 1024

// 5MB (5,242,880 bytes)
limit: 5 * 1024 * 1024

// 10MB (10,485,760 bytes)
limit: 10 * 1024 * 1024
```

## Cara Kerja Body Limit

Middleware memeriksa header `Content-Length` sebelum body dibaca:

1. **Request GET/HEAD** - Secara otomatis dilewati (tidak ada body)
2. **Content-Length ada** - Memvalidasi terhadap limit
3. **Transfer-Encoding ada** - Melewati (chunked encoding)
4. **Tidak ada header** - Melewati (ukuran tidak diketahui)

### Kepatuhan RFC 7230

Middleware mengikuti RFC 7230:

- Jika `Transfer-Encoding` dan `Content-Length` keduanya ada, `Transfer-Encoding` memiliki prioritas dan ukuran body tidak divalidasi
- Hanya memvalidasi `Content-Length` ketika `Transfer-Encoding` tidak ada
- Menangani chunked encoding dengan melewati (tidak dapat memeriksa ukuran sebelumnya)

## Contoh Lengkap

```typescript
// 1. Import Router dan Mware
import { Router, Mware } from '@neabyte/deserve'

// 2. Buat router
const router = new Router({ routesDir: './routes' })

// 3. Limit global 1MB
router.use(Mware.bodyLimit({ limit: 1024 * 1024 }))

// 4. Per-path: /uploads 5MB, /api 10MB
router.use('/uploads', Mware.bodyLimit({ limit: 5 * 1024 * 1024 }))
router.use('/api', Mware.bodyLimit({ limit: 10 * 1024 * 1024 }))

// 5. Jalankan server
await router.serve(8000)
```

## Penanganan Error

Body Limit secara otomatis menggunakan `router.catch()` jika didefinisikan:

```typescript
// 1. Tangkap 413 (payload too large) dan error lain
router.catch((ctx, { statusCode, error }) => {
  if (statusCode === 413) {
    return ctx.send.json(
      { error: 'Request entity too large', message: error?.message },
      { status: 413 }
    )
  }
  return ctx.send.json(
    {
      error: error?.message ?? 'Error tidak diketahui'
    },
    { status: statusCode }
  )
})

// 2. Pasang body limit (akan pakai router.catch di atas)
router.use(Mware.bodyLimit({ limit: 1024 * 1024 }))
```

Ketika limit terlampaui, middleware mengembalikan pesan `Request entity too large` dengan `status code: 413` sebelum body request dibaca.
