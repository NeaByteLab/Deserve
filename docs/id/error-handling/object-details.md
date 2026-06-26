---
description: "Sesuaikan response error dengan router.catch() dan objek ErrorInfo."
---

# Detail Objek Error

Setiap kesalahan di Deserve mengalir lewat satu tempat. Lemparan route handler, kegagalan validasi, rute yang hilang, dan error berkas statis semua tiba di handler yang sama, tempat balasan khusus mengambil alih dari [response default](/id/error-handling/default-behavior).

## Penanganan Error Dasar

Tangani error dengan method `router.catch()`:

```typescript twoslash
import { Router, type HttpStatusCode } from '@neabyte/deserve'

const router = new Router({
  routes: { directory: './routes' }
})

// Tangkap error dari rute mana pun
router.catch((ctx, error) => {
  // Balas dengan status error
  return ctx.send.json(
    {
      error: 'Something went wrong',
      statusCode: error.statusCode,
      pathname: error.pathname,
      method: error.method,
      url: error.url
    },
    { status: error.statusCode as HttpStatusCode }
  )
})

await router.serve(8000)
```

## Struktur Objek Error

Error handler menerima objek context dan objek error dengan properti ini:

- **`error.statusCode`** - status code HTTP (404, 500, dll.)
- **`error.pathname`** - path request, misalnya `/api/users`
- **`error.url`** - URL request lengkap
- **`error.method`** - metode HTTP
- **`error.error`** - instance Error asli

```typescript twoslash
import { Router, type HttpStatusCode } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Handler membaca objek error
router.catch((ctx, error) => {
  // Cadangan saat tidak ada pesan asli
  return ctx.send.json(
    {
      error: error.error?.message || 'An error occurred',
      status: error.statusCode,
      pathname: error.pathname,
      method: error.method,
      url: error.url
    },
    { status: error.statusCode as HttpStatusCode }
  )
})
```

## Skenario Error Umum

### 404 - Rute Tidak Ditemukan

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
router.catch((ctx, error) => {
  if (error.statusCode === 404) {
    return ctx.send.json(
      {
        error: 'Route not found',
        pathname: error.pathname
      },
      { status: 404 }
    )
  }
  return null
})
```

### 500 - Error Server

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
router.catch((ctx, error) => {
  if (error.statusCode === 500) {
    console.error('Server error:', error.error)
    return ctx.send.json(
      {
        error: 'Internal server error'
      },
      {
        status: 500
      }
    )
  }
  return null
})
```

## Penanganan Error Route Handler

Tangkap error di route handler individual:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export async function POST(ctx: Context): Promise<Response> {
  try {
    const data = await ctx.get.body()
    // Proses data...
    return ctx.send.json({
      success: true
    })
  } catch (error) {
    return ctx.send.json(
      {
        error: 'Failed to process request'
      },
      {
        status: 500
      }
    )
  }
}
```

## Error Validasi

Kontrak [validasi](/id/middleware/validation/overview) yang ditolak melempar **422 Unprocessable Entity** dan menjaga alasan kegagalan di `error.error.cause` sebagai array string. `router.catch` yang sama menanganinya, jadi membaca alasan itu mengubah kegagalan menjadi response tingkat field:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
router.catch((ctx, error) => {
  if (error.statusCode === 422 && Array.isArray(error.error.cause)) {
    // Munculkan tiap alasan validasi
    return ctx.send.json(
      { error: 'Validation failed', reasons: error.error.cause },
      { status: 422 }
    )
  }
  return null
})
```

Bagaimana sebuah kontrak menghasilkan alasan itu ada di [Membaca Data Tervalidasi](/id/middleware/validation/reading-data#cara-kegagalan-muncul), yang menjaga aturan validasi di satu tempat dan pembentukan response di sini.
