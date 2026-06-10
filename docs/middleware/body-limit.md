---
description: "Limit incoming request body size to guard against oversized payloads."
---

# Body Limit Middleware

> **Reference**: [RFC 7230 HTTP/1.1 Message Syntax and Routing](https://datatracker.ietf.org/doc/html/rfc7230#section-3.3.1)

Body Limit middleware enforces a maximum request body size. When a body is present, the body stream is always wrapped with a limiter so the size is enforced regardless of headers, which keeps large payloads from overwhelming the server.

## Basic Usage

Apply body limit middleware using Deserve's built-in middleware:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()

// Cap request bodies at 1MB
router.use(
  Mware.bodyLimit({
    limit: 1024 * 1024
  })
)

await router.serve(8000)
```

## Route-Specific Limits

Apply different body limits to specific routes:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// 1MB limit for general routes
router.use(Mware.bodyLimit({
  limit: 1024 * 1024
}))

// 5MB limit for upload routes
router.use('/uploads', Mware.bodyLimit({
  limit: 5 * 1024 * 1024
}))

// 10MB limit for API routes
router.use('/api', Mware.bodyLimit({
  limit: 10 * 1024 * 1024
}))
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

1. **GET/HEAD or no body** - nothing is wrapped and the request passes through.
2. **Body present** - the body stream is wrapped with the limiter. When the client sends more bytes than `limit`, reading stops and the middleware responds with **413**.
3. **Content-Length** - when present without `Transfer-Encoding` and above `limit`, the request is rejected before the body is read.

### RFC 7230

- When both `Transfer-Encoding` and `Content-Length` are present, `Transfer-Encoding` takes precedence.
- Chunked or unknown-length bodies are still limited by the wrapped stream, and only the bytes read count toward the limit.

## Complete Example

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router({
  routesDir: './routes'
})

// Global 1MB limit
router.use(Mware.bodyLimit({
  limit: 1024 * 1024
}))

// Larger limits for uploads and API
router.use('/uploads', Mware.bodyLimit({
  limit: 5 * 1024 * 1024
}))
router.use('/api', Mware.bodyLimit({
  limit: 10 * 1024 * 1024
}))

await router.serve(8000)
```

## Error Handling

When the limit is exceeded, the middleware returns message `Request body exceeds <limit> bytes limit` with **status code 413**. A known `Content-Length` above the limit is rejected before the body is read, while a chunked or oversized stream is rejected as soon as the extra bytes arrive. To shape that response, register a single handler with [`router.catch()`](/error-handling/object-details), or rely on the [default behavior](/error-handling/default-behavior).
