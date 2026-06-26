---
description: "Batasi ukuran body request masuk untuk mencegah payload yang terlalu besar."
---

# Middleware Body Limit

> **Referensi**: [RFC 7230 HTTP/1.1 Message Syntax and Routing](https://datatracker.ietf.org/doc/html/rfc7230#section-3.3.1)

Middleware Body Limit memberlakukan ukuran maksimum body request dengan memeriksa header `Content-Length`. Ketika request membawa body pada metode yang mengizinkannya, middleware menolak payload berukuran berlebih sebelum body dibaca, yang mencegah payload besar membebani server.

## Penggunaan Dasar

Terapkan middleware body limit memakai middleware bawaan Deserve:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()

// Batasi body request di 1MB
router.use(
  Mware.bodyLimit({
    limit: 1024 * 1024
  })
)

await router.serve(8000)
```

## Batas Spesifik Rute

Terapkan batas body berbeda ke rute tertentu:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Batas 1MB untuk rute umum
router.use(Mware.bodyLimit({
  limit: 1024 * 1024
}))

// Batas 5MB untuk rute upload
router.use('/uploads', Mware.bodyLimit({
  limit: 5 * 1024 * 1024
}))

// Batas 10MB untuk rute API
router.use('/api', Mware.bodyLimit({
  limit: 10 * 1024 * 1024
}))
```

## Opsi Konfigurasi

### `limit`

Ukuran body maksimum dalam byte. Harus angka positif berhingga, jika tidak middleware melempar `Deno.errors.InvalidData` saat dibuat:

```typescript
// 1MB (1,048,576 byte)
limit: 1024 * 1024

// 5MB (5,242,880 byte)
limit: 5 * 1024 * 1024

// 10MB (10,485,760 byte)
limit: 10 * 1024 * 1024
```

## Cara Kerja

Middleware memeriksa ukuran yang dideklarasikan dari header `Content-Length` sebelum body dibaca:

1. **GET atau HEAD** - request lolos tanpa pemeriksaan, karena metode ini tidak membawa body
2. **Content-Length ada** - ketika nilainya bukan angka, negatif, atau di atas `limit`, request ditolak dengan **413** sebelum body dibaca
3. **Tanpa Content-Length** - request lolos, dan body dibaca normal oleh handler

Ini membatasi berapa byte yang boleh dideklarasikan sebuah body. Memeriksa bentuk byte itu adalah langkah terpisah yang dijalankan kontrak [validasi](/id/middleware/validation/overview) setelah body berada dalam batas.

## Penanganan Error

Ketika batas terlampaui, middleware gagal dengan status **413** dan pesan `Request body exceeds <limit> bytes limit`. Kegagalan itu dialirkan ke [error handler terpusat](/id/error-handling/object-details) seperti error lain, jadi bentuk response di sana atau andalkan [perilaku default](/id/error-handling/default-behavior). Event observability `body:rejected` juga menyala dengan batas dan ukuran yang dideklarasikan, dibahas di [Referensi Event](/id/middleware/observability/events).
