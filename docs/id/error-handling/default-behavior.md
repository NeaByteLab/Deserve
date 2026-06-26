---
description: "Cara Deserve menangani error tak tertangkap secara default dan response yang dihasilkannya."
---

# Perilaku Error Default

Mekanisme penanganan error ini menangkap setiap error yang terjadi selama runtime server, yang mencakup error route handler, kegagalan middleware, skenario rute tidak ditemukan, error berkas statis, dan exception tak tertangkap lainnya selama pemrosesan request. Tanpa error handler khusus yang diatur lewat `router.catch()`, Deserve memakai perilaku default ini supaya server tidak pernah crash karena error tak tertangani.

![Saat error terjadi, request diarahkan ke custom handler jika router.catch terdefinisi, jika tidak ke default handler yang mengembalikan JSON atau HTML sesuai Accept, lalu satu response](/diagrams/default-error-behavior.png)

## Perilaku Default Dasar

Tanpa panggilan ke `router.catch()`, Deserve menangani setiap error dengan response default, JSON atau HTML, dan status code yang cocok:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routes: { directory: './routes' }
})

// Tanpa router.catch, default mengambil alih

await router.serve(8000)
```

## Response Error Default

Response error default (tanpa `router.catch()` khusus) mengikuti header `Accept` klien:

- **Accept mencakup `application/json` atau `application/problem+json`** → body problem-details `{ type, title, status, instance }` dikirim sebagai `application/problem+json`
- **Selain itu** → body HTML: halaman error sederhana dengan status dan pesan (di-escape)

Juga:

- **Status Code**: Mempertahankan status code error asli (404, 500, dll.)
- **Header**: Mencakup header yang diatur lewat `ctx.set.header()` sebelum error

```typescript
// Contoh response default (klien minta JSON)
// Status: 404
// Content-Type: application/problem+json
// Body: { "type": "about:blank", "title": "Not Found", "status": 404, "instance": "/api/foo" }

// Contoh response default (klien tidak minta JSON)
// Status: 404
// Body: HTML dengan <title>404</title> dan pesan error
```

Bentuk problem-details mengikuti [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457), di mana `type` adalah URI masalah, `title` ringkasan singkat, `status` mengulang kodenya, dan `instance` membawa path request. Sebuah `router.catch()` khusus mengganti body ini dengan bentuk apa pun yang cocok untuk klien, dibahas di [Detail Objek Error](/id/error-handling/object-details).

## Skenario Error

Penanganan error default mencakup semua jenis error yang bisa terjadi selama pemrosesan request:

### 404 - Rute Tidak Ditemukan

Ketika tidak ada rute yang cocok dengan path request sama sekali:

```typescript
// GET /nonexistent
// Status: 404
// Body: JSON atau HTML (lewat header Accept)
// Headers: {}
```

Ini mencakup:

- Rute yang tidak ada
- Path yang tidak cocok dengan pola mana pun saat resolusi routing

### 405 - Metode Tidak Diizinkan

Ketika path cocok dengan sebuah rute tapi metodenya tidak punya handler, response-nya **405** dengan header `Allow` yang mendaftar metode yang didukung:

```typescript
// DELETE /users (hanya GET dan POST terdefinisi)
// Status: 405
// Body: JSON atau HTML (lewat header Accept)
// Headers: { Allow: "GET, HEAD, POST" }
```

`HEAD` ditambahkan otomatis setiap kali handler `GET` ada.

### 422 - Validasi Gagal

Ketika kontrak [validasi](/id/middleware/validation/overview) menolak input request, response default adalah body problem-details polos dengan status 422:

```typescript
// POST /users dengan body tidak valid
// Status: 422
// Content-Type: application/problem+json
// Body: { "type": "about:blank", "title": "Unprocessable Entity",
//         "status": 422, "instance": "/users" }
```

Body default tidak pernah mendaftar alasan kegagalan. Alasan itu menumpang di `error.error.cause` sebagai array string, jadi sebuah [`router.catch()`](/id/error-handling/object-details#error-validasi) khusus membacanya untuk membangun response tingkat field. Bagaimana sebuah kontrak menghasilkan alasan itu ada di [Membaca Data Tervalidasi](/id/middleware/validation/reading-data#cara-kegagalan-muncul).

### 500 - Error Server

Ketika route handler melempar error atau exception apa pun:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Lemparan ditangkap oleh Deserve
  throw new Error('Something went wrong')
  // Balasan default adalah 500 JSON atau HTML
}
```

Ini mencakup:

- Exception tak tertangkap di route handler
- Error runtime (TypeError, ReferenceError, dll.)
- Kegagalan operasi async
- Error apa pun yang dilempar selama eksekusi handler

### Error Middleware

Ketika fungsi middleware melempar error atau gagal:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Middleware yang melempar juga ditangkap
router.use(async (ctx, next) => {
  throw new Error('Middleware failed')
  // Balasan default adalah 500 JSON atau HTML
})
```

Semua error middleware ditangkap dan ditangani oleh error handler default.

### Error Berkas Statis

Ketika melayani berkas statis menemui masalah:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Layani berkas statis di /static
router.static(
  '/static',
  {
    path: './public'
  }
)

// Berkas hilang (GET /static/missing.jpg):
//   Status 404, JSON atau HTML per Accept
```

Ini mencakup:

- Error berkas tidak ditemukan (404)
- Error izin baca berkas (500)
- Kegagalan operasi filesystem (500)
- Error resolusi path tidak valid (500)

### Error Pemrosesan Request

Error tak terduga apa pun selama penanganan request:

```typescript
// Error di:
// - Parsing URL
// - Pembuatan Context
// - Pencocokan rute
// - Pembuatan response
// Semua default ke: Status 500, body JSON atau HTML (lewat Accept)
```

### Jaminan Penanganan Error

Error handler default memastikan:

- **Tanpa crash server**: Semua error ditangkap dan diubah jadi response HTTP
- **Perilaku konsisten**: Format response error sama di semua jenis error
- **Pelestarian header**: Header yang diatur sebelum error dipertahankan di response
- **Akurasi status code**: Status code error asli (404, 500, dll.) dipertahankan
