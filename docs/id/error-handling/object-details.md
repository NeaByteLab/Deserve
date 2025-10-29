# Detail Objek Error

Deserve menyediakan penanganan error untuk route execution errors, validation errors, not found errors, static file errors, dan custom error responses.

## Penanganan Error Dasar

Tangani error dengan method `router.catch()`:

```typescript
import { Router } from '@neabyte/deserve'

const router = new Router({ routesDir: './routes' })

router.catch((ctx, error) => {
  return ctx.send.json({
    error: 'Something went wrong',
    statusCode: error.statusCode,
    path: error.path,
    method: error.method
  }, { status: error.statusCode })
})

router.serve(8000)
```

## Struktur Objek Error

Error handler menerima objek context dan objek error:

```typescript
router.catch((ctx, error) => {
  // error.statusCode - HTTP status code (404, 500, dll.)
  // error.path - Request path
  // error.method - HTTP method
  // error.error - Objek Error (jika tersedia)
  return ctx.send.json({
    error: error.error?.message || 'An error occurred',
    status: error.statusCode,
    path: error.path,
    method: error.method
  }, { status: error.statusCode })
})
```

## Skenario Error Umum

### 404 - Route Tidak Ditemukan

```typescript
router.catch((ctx, error) => {
  if (error.statusCode === 404) {
    return ctx.send.json({
      error: 'Route not found', path: error.path
    }, { status: 404 })
  }
  return null // Gunakan default error handling
})
```

### 500 - Server Errors

```typescript
router.catch((ctx, error) => {
  if (error.statusCode === 500) {
    console.error('Server error:', error.error)
    return ctx.send.json({ error: 'Internal server error' }, { status: 500 })
  }
  return null
})
```

## Penanganan Error di Route Handler

Tangani error di route handler individual:

```typescript
export async function POST(ctx: Context): Promise<Response> {
  try {
    const data = await ctx.body()
    // Process data...
    return ctx.send.json({ success: true })
  } catch (error) {
    return ctx.send.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
```

## Validation Errors

Kembalikan status code yang sesuai untuk validation errors:

```typescript
export async function POST(ctx: Context): Promise<Response> {
  const data = await ctx.body()
  if (!data.email) {
    return ctx.send.json(
      { error: 'Email is required' },
      { status: 400 }
    )
  }
  // Process valid data...
  return ctx.send.json({ success: true })
}
```

