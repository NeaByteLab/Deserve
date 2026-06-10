---
description: "Sesuaikan response error dengan router.catch() dan objek ErrorInfo."
---

# Detail Objek Error

Deserve menyediakan penanganan error untuk error eksekusi rute, error validasi, error tidak ditemukan, error berkas statis, dan response error khusus.

## Penanganan Error Dasar

Tangani error dengan method `router.catch()`:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routesDir: './routes'
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
    { status: error.statusCode }
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
import { Router } from '@neabyte/deserve'

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
    { status: error.statusCode }
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
    const data = await ctx.body()
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

Kembalikan status code yang sesuai untuk error validasi:

```typescript twoslash
import type { Context, DataRecord } from '@neabyte/deserve'
// ---cut---
export async function POST(ctx: Context): Promise<Response> {
  const data = await ctx.body() as DataRecord
  if (!data.email) {
    return ctx.send.json(
      {
        error: 'Email is required'
      },
      {
        status: 400
      }
    )
  }
  // Proses data valid...
  return ctx.send.json({
    success: true
  })
}
```
