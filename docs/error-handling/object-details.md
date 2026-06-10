---
description: "Customize error responses with router.catch() and the ErrorInfo object."
---

# Error Object Details

Deserve provides error handling for route execution errors, validation errors, not found errors, static file errors, and custom error responses.

## Basic Error Handling

Handle errors with the `router.catch()` method:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routesDir: './routes'
})

// Catch errors from any route
router.catch((ctx, error) => {
  // Reply with the error status
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

## Error Object Structure

The error handler receives the context object and an error object with these properties:

- **`error.statusCode`** - HTTP status code (404, 500, etc.)
- **`error.pathname`** - request path, for example `/api/users`
- **`error.url`** - full request URL
- **`error.method`** - HTTP method
- **`error.error`** - the original Error instance

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Handler reads the error object
router.catch((ctx, error) => {
  // Fall back when no original message
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

### 500 - Server Errors

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

## Route Handler Error Handling

Catch errors in individual route handlers:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export async function POST(ctx: Context): Promise<Response> {
  try {
    const data = await ctx.body()
    // Process data...
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

## Validation Errors

Return appropriate status codes for validation errors:

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
  // Process valid data...
  return ctx.send.json({
    success: true
  })
}
```
