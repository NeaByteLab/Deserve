# Object Details

Deserve provides error handling for route execution errors, validation errors, not found errors, static file errors, and custom error responses.

## Basic Error Handling

Handle errors with the `router.catch()` method:

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

## Error Object Structure

The error handler receives the context object and an error object:

```typescript
router.catch((ctx, error) => {
  // error.statusCode - HTTP status code (404, 500, etc.)
  // error.path - Request path
  // error.method - HTTP method
  // error.error - Error object (if available)
  return ctx.send.json({
    error: error.error?.message || 'An error occurred',
    status: error.statusCode,
    path: error.path,
    method: error.method
  }, { status: error.statusCode })
})
```

## Common Error Scenarios

### 404 - Route Not Found

```typescript
router.catch((ctx, error) => {
  if (error.statusCode === 404) {
    return ctx.send.json({
      error: 'Route not found', path: error.path
    }, { status: 404 })
  }
  return null // Use default error handling
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

## Route Handler Error Handling

Catch errors in individual route handlers:

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

Return appropriate status codes for validation errors:

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
