# Body Limit Middleware

> [!WARNING] This feature is available in the development version but not yet released.

> **Reference**: [RFC 7230 HTTP/1.1 Message Syntax and Routing](https://datatracker.ietf.org/doc/html/rfc7230#section-3.3.1)

Body Limit middleware enforces maximum request body size by checking the `Content-Length` header. Prevents large payloads from overwhelming your server.

## Basic Usage

Apply body limit middleware using Deserve's built-in middleware:

```typescript
import { Router, Mware } from '@neabyte/deserve'

const router = new Router()

router.use(Mware.bodyLimit({
  limit: 1024 * 1024 // 1MB limit
}))

await router.serve(8000)
```

## Route-Specific Limits

Apply different body limits to specific routes:

```typescript
// 1MB limit for general routes
router.use(Mware.bodyLimit({ limit: 1024 * 1024 }))

// 5MB limit for upload routes
router.use('/uploads', Mware.bodyLimit({ limit: 5 * 1024 * 1024 }))

// 10MB limit for API routes
router.use('/api', Mware.bodyLimit({ limit: 10 * 1024 * 1024 }))
```

## Configuration Options

### `limit`

Maximum body size in bytes:

```typescript
// 1MB (1,048,576 bytes)
limit: 1024 * 1024

// 5MB (5,242,880 bytes)
limit: 5 * 1024 * 1024

// 10MB (10,485,760 bytes)
limit: 10 * 1024 * 1024
```

## How It Works

The middleware checks the `Content-Length` header before the body is read:

1. **GET/HEAD requests** - Automatically skipped (no body)
2. **Content-Length present** - Validates against limit
3. **Transfer-Encoding present** - Passes through (chunked encoding)
4. **No headers** - Passes through (size unknown)

### RFC 7230 Compliance

The middleware follows RFC 7230:
- If both `Transfer-Encoding` and `Content-Length` are present, `Transfer-Encoding` takes precedence and body size is not validated
- Only validates `Content-Length` when `Transfer-Encoding` is absent
- Handles chunked encoding by passing through (can't check size upfront)

## Complete Example

```typescript
import { Router, Mware } from '@neabyte/deserve'

const router = new Router({ routesDir: './routes' })

// Global 1MB limit
router.use(Mware.bodyLimit({ limit: 1024 * 1024 }))

// 5MB for file uploads
router.use('/uploads', Mware.bodyLimit({ limit: 5 * 1024 * 1024 }))

// 10MB for API routes
router.use('/api', Mware.bodyLimit({ limit: 10 * 1024 * 1024 }))

await router.serve(8000)
```

## Error Handling

Body Limit automatically uses `router.catch()` if defined:

```typescript
router.catch((ctx, { statusCode, error }) => {
  if (statusCode === 413) {
    return ctx.send.json(
      { error: 'Request entity too large', message: error?.message },
      { status: 413 }
    )
  }
  return ctx.send.json({
    error: error?.message ?? 'Unknown error'
  }, { status: statusCode })
})

router.use(Mware.bodyLimit({ limit: 1024 * 1024 }))
```

When the limit is exceeded, the middleware returns message `Request entity too large` with `status code: 413` before the request body is read.
