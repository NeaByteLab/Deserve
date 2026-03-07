# Detail Objek Error

Deserve menyediakan penanganan error untuk route execution errors, validation errors, not found errors, static file errors, dan custom error responses.

## Penanganan Error Dasar

Tangani error dengan method `router.catch()`:

```typescript
// 1. Import Router
import { Router } from '@neabyte/deserve'

// 2. Buat router dengan direktori routes
const router = new Router({ routesDir: './routes' })

// 3. Daftarkan error handler global: terima ctx dan objek error
router.catch((ctx, error) => {
  // 4. Kembalikan response JSON dengan status sesuai error
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

// 5. Jalankan server
await router.serve(8000)
```

## Struktur Objek Error

Error handler menerima objek context dan objek error. Properti yang tersedia (sesuai implementasi):

- **`error.statusCode`** - Kode status HTTP (404, 500, dll.)
- **`error.pathname`** - Path request (mis. `/api/users`)
- **`error.url`** - URL lengkap request
- **`error.method`** - HTTP method
- **`error.error`** - Objek Error asli (jika ada)

```typescript
// 1. Handler menerima ctx dan error (pathname, url, method, statusCode, error)
router.catch((ctx, error) => {
  // 2. Pakai error.error?.message untuk pesan asli; fallback ke default
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

### 404 — Route Tidak Ditemukan

```typescript
// 1. Cek status 404 (route tidak ditemukan)
router.catch((ctx, error) => {
  if (error.statusCode === 404) {
    // 2. Response kustom untuk not found
    return ctx.send.json(
      {
        error: 'Route not found',
        pathname: error.pathname
      },
      { status: 404 }
    )
  }
  // 3. Return null agar default error handling yang mengurus
  return null
})
```

### 500 — Server Errors

```typescript
// 1. Cek status 500 (server error)
router.catch((ctx, error) => {
  if (error.statusCode === 500) {
    // 2. Log error asli ke console
    console.error('Server error:', error.error)
    // 3. Response kustom untuk client
    return ctx.send.json({ error: 'Internal server error' }, { status: 500 })
  }
  return null
})
```

## Penanganan Error Di Route Handler

Tangani error di route handler individual:

```typescript
export async function POST(ctx: Context): Promise<Response> {
  try {
    // 1. Baca body request
    const data = await ctx.body()
    // 2. Proses data (validasi, simpan, dll.)
    return ctx.send.json({ success: true })
  } catch (error) {
    // 3. Tangkap error dan kirim response 500
    return ctx.send.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
```

## Error Validasi

Kembalikan status code yang sesuai untuk validation errors:

```typescript
export async function POST(ctx: Context): Promise<Response> {
  // 1. Baca body
  const data = await ctx.body()
  // 2. Validasi: jika email kosong, kembalikan 400
  if (!data.email) {
    return ctx.send.json({ error: 'Email is required' }, { status: 400 })
  }
  // 3. Data valid, lanjut proses dan sukses
  return ctx.send.json({ success: true })
}
```
