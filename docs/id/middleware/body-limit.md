---
description: "Batasi ukuran body request masuk untuk menjaga dari payload kebesaran."
---

# Middleware Body Limit

> **Referensi**: [RFC 7230 HTTP/1.1 Message Syntax and Routing](https://datatracker.ietf.org/doc/html/rfc7230#section-3.3.1)

Middleware Body Limit memberlakukan ukuran maksimum body request. Ketika body ada, stream body selalu dibungkus dengan limiter sehingga ukurannya diberlakukan terlepas dari header, yang menjaga payload besar dari membebani server.

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
router.use(Mware.bodyLimit({ limit: 1024 * 1024 }))

// Batas 5MB untuk rute upload
router.use('/uploads', Mware.bodyLimit({ limit: 5 * 1024 * 1024 }))

// Batas 10MB untuk rute API
router.use('/api', Mware.bodyLimit({ limit: 10 * 1024 * 1024 }))
```

## Opsi Konfigurasi

### `limit`

Ukuran body maksimum dalam byte:

```typescript
// 1MB (1,048,576 byte)
limit: 1024 * 1024

// 5MB (5,242,880 byte)
limit: 5 * 1024 * 1024

// 10MB (10,485,760 byte)
limit: 10 * 1024 * 1024
```

## Cara Kerja

Ketika request punya body, middleware membungkus stream body dengan limiter byte sehingga ukurannya diberlakukan saat body dibaca (bukan hanya lewat header):

1. **GET/HEAD atau tanpa body** - tidak ada yang dibungkus dan request lolos.
2. **Body ada** - stream body dibungkus dengan limiter. Ketika klien mengirim byte lebih banyak dari `limit`, pembacaan berhenti dan middleware membalas dengan **413**.
3. **Content-Length** - ketika ada tanpa `Transfer-Encoding` dan di atas `limit`, request ditolak sebelum body dibaca.

### RFC 7230

- Ketika `Transfer-Encoding` dan `Content-Length` sama-sama ada, `Transfer-Encoding` didahulukan.
- Body chunked atau panjang tak diketahui tetap dibatasi oleh stream yang dibungkus, dan hanya byte yang dibaca yang dihitung terhadap batas.

## Contoh Lengkap

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router({ routesDir: './routes' })

// Batas global 1MB
router.use(Mware.bodyLimit({ limit: 1024 * 1024 }))

// Batas lebih besar untuk upload dan API
router.use('/uploads', Mware.bodyLimit({ limit: 5 * 1024 * 1024 }))
router.use('/api', Mware.bodyLimit({ limit: 10 * 1024 * 1024 }))

await router.serve(8000)
```

## Penanganan Error

Ketika batas terlampaui, middleware mengembalikan pesan `Request body exceeds <limit> bytes limit` dengan **status code 413**. `Content-Length` yang diketahui di atas batas ditolak sebelum body dibaca, sementara stream chunked atau kebesaran ditolak begitu byte tambahan tiba. Untuk membentuk response itu, daftarkan satu handler dengan [`router.catch()`](/id/error-handling/object-details), atau andalkan [perilaku default](/id/error-handling/default-behavior).
