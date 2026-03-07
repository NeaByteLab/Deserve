# Body Limit Middleware

> **Reference**: [RFC 7230 HTTP/1.1 Message Syntax and Routing](https://datatracker.ietf.org/doc/html/rfc7230#section-3.3.1)

Body Limit middleware enforces maximum request body size. When a body is present, the body stream is always wrapped with a limiter so size is enforced regardless of headers. Prevents large payloads from overwhelming your server.

## Basic Usage

Apply body limit middleware using Deserve's built-in middleware:

```typescript
// 1. Import Router and Mware
import { Router, Mware } from '@neabyte/deserve'

// 2. Create router
const router = new Router()

// 3. Limit request body to 1MB max; if larger → 413
router.use(
  Mware.bodyLimit({
    limit: 1024 * 1024
  })
)

// 4. Start server
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

When a request has a body, the middleware wraps the body stream with a byte limiter so the size is enforced as the body is read (not only via headers):

1. **GET/HEAD or no body** - No wrapping; request passes through.
2. **Body present** - Body stream is always wrapped with the limiter. If the client sends more bytes than `limit`, reading stops and the middleware responds with **413 Request Entity Too Large**.
3. **Content-Length** - When present and above `limit`, the middleware may reject the request before reading the body (early reject).

### RFC 7230

- If both `Transfer-Encoding` and `Content-Length` are present, `Transfer-Encoding` takes precedence.
- Chunked or unknown-length bodies are still limited by the wrapped stream; only the bytes read count toward the limit.

## Complete Example

```typescript
// 1. Import Router and Mware
import { Router, Mware } from '@neabyte/deserve'

// 2. Create router
const router = new Router({ routesDir: './routes' })

// 3. Global 1MB limit
router.use(Mware.bodyLimit({ limit: 1024 * 1024 }))

// 4. Per-path: /uploads 5MB, /api 10MB
router.use('/uploads', Mware.bodyLimit({ limit: 5 * 1024 * 1024 }))
router.use('/api', Mware.bodyLimit({ limit: 10 * 1024 * 1024 }))

// 5. Start server
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
  return ctx.send.json(
    {
      error: error?.message ?? 'Unknown error'
    },
    { status: statusCode }
  )
})

router.use(Mware.bodyLimit({ limit: 1024 * 1024 }))
```

When the limit is exceeded, the middleware returns message `Request entity too large` with `status code: 413` before the request body is read.
