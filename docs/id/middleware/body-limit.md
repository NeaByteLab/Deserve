# Middleware Body Limit

> **Referensi**: [RFC 7230 HTTP/1.1 Message Syntax and Routing](https://datatracker.ietf.org/doc/html/rfc7230#section-3.3.1)

Middleware Body Limit menegakkan ukuran body request maksimum. Jika body ada, stream body selalu dibungkus dengan limiter sehingga ukuran ditegakkan terlepas dari header. Mencegah payload besar yang dapat membebani server Anda.

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

Jika request punya body, middleware membungkus stream body dengan byte limiter sehingga ukuran ditegakkan saat body dibaca (bukan hanya lewat header):

1. **GET/HEAD atau tanpa body** - Tidak dibungkus; request dilewati.
2. **Body ada** - Stream body selalu dibungkus dengan limiter. Jika klien mengirim byte lebih dari `limit`, pembacaan dihentikan dan middleware merespons **413 Request Entity Too Large**.
3. **Content-Length** - Jika ada dan di atas `limit`, middleware bisa menolak request sebelum membaca body (early reject).

### RFC 7230

- Jika `Transfer-Encoding` dan `Content-Length` keduanya ada, `Transfer-Encoding` diutamakan.
- Body chunked atau ukuran tidak diketahui tetap dibatasi oleh stream yang dibungkus; hanya byte yang dibaca yang dihitung ke limit.

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
