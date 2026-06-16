---
description: "Limit incoming request body size to guard against oversized payloads."
---

# Body Limit Middleware

> **Reference**: [RFC 7230 HTTP/1.1 Message Syntax and Routing](https://datatracker.ietf.org/doc/html/rfc7230#section-3.3.1)

Body Limit middleware enforces a maximum request body size. When a body is present on a method that allows one, the body stream is wrapped with a limiter so the size is enforced as bytes arrive, not only from headers, which keeps large payloads from overwhelming the server.

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

When a request can carry a body, the middleware checks the declared size first, then wraps the body stream with a byte limiter so the size is enforced as the body is read, not only from headers:

1. **GET or HEAD** - nothing is wrapped and the request passes through.
2. **Content-Length** - when present without `Transfer-Encoding`, the request is rejected before the body is read if the value is missing a number, negative, or above `limit`.
3. **Body present** - on a method that allows a body, the stream is wrapped with the limiter. When the client sends more bytes than `limit`, reading stops and the middleware responds with **413**.

### RFC 7230

- When both `Transfer-Encoding` and `Content-Length` are present, `Transfer-Encoding` takes precedence.
- Chunked or unknown-length bodies are still limited by the wrapped stream, and only the bytes read count toward the limit.

This middleware caps how many bytes a body may carry. Checking the shape of those bytes is a separate step that a [validation](/middleware/validation/overview) contract runs once the body is within the limit.

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

When the limit is exceeded, the middleware fails with status **413** and message `Request body exceeds <limit> bytes limit`, whether a declared `Content-Length` trips it before the body is read or an oversized stream trips it as the extra bytes arrive. That failure routes through the [central error handler](/error-handling/object-details) like any other, so shape the response there or rely on the [default behavior](/error-handling/default-behavior).
