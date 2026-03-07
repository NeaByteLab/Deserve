# Error Object Details

Deserve provides error handling for route execution errors, validation errors, not found errors, static file errors, and custom error responses.

## Basic Error Handling

Handle errors with the `router.catch()` method:

```typescript
// 1. Import Router
import { Router } from '@neabyte/deserve'

// 2. Create router with routes directory
const router = new Router({ routesDir: './routes' })

// 3. Register global error handler: receive ctx and error object
router.catch((ctx, error) => {
  // 4. Return JSON response with status from error
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

// 4. Start server
await router.serve(8000)
```

## Error Object Structure

The error handler receives the context object and an error object. Available properties (per implementation):

- **`error.statusCode`** - HTTP status code (404, 500, etc.)
- **`error.pathname`** - Request path (e.g. `/api/users`)
- **`error.url`** - Full request URL
- **`error.method`** - HTTP method
- **`error.error`** - Original Error object (if any)

```typescript
// 1. Handler receives ctx and error (pathname, url, method, statusCode, error)
router.catch((ctx, error) => {
  // 2. Use error.error?.message for original message; fallback to default
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

## Common Error Scenarios

### 404 - Route Not Found

```typescript
router.catch((ctx, error) => {
  if (error.statusCode === 404) {
    return ctx.send.json({ error: 'Route not found', pathname: error.pathname }, { status: 404 })
  }
  return null
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
    return ctx.send.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
```

## Validation Errors

Return appropriate status codes for validation errors:

```typescript
export async function POST(ctx: Context): Promise<Response> {
  const data = await ctx.body()
  if (!data.email) {
    return ctx.send.json({ error: 'Email is required' }, { status: 400 })
  }
  // Process valid data...
  return ctx.send.json({ success: true })
}
```
