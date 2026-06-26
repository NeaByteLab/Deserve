---
description: "Limit incoming request body size to guard against oversized payloads."
---

# Body Limit Middleware

> **Reference**: [RFC 7230 HTTP/1.1 Message Syntax and Routing](https://datatracker.ietf.org/doc/html/rfc7230#section-3.3.1)

Body Limit middleware enforces a maximum request body size by checking the `Content-Length` header. When a request carries a body on a method that allows one, the middleware rejects oversized payloads before the body is ever read, which keeps large payloads from overwhelming the server.

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

Maximum body size in bytes. Must be a positive finite number, otherwise the middleware throws `Deno.errors.InvalidData` when created:

```typescript
// 1MB (1,048,576 bytes)
limit: 1024 * 1024

// 5MB (5,242,880 bytes)
limit: 5 * 1024 * 1024

// 10MB (10,485,760 bytes)
limit: 10 * 1024 * 1024
```

## How It Works

The middleware checks the declared size from the `Content-Length` header before the body is read:

1. **GET or HEAD** - the request passes through without a check, since these methods carry no body
2. **Content-Length present** - when the value is missing a number, negative, or above `limit`, the request is rejected with **413** before the body is read
3. **No Content-Length** - the request passes through, and the body is read normally by the handler

This caps how many bytes a body may declare. Checking the shape of those bytes is a separate step that a [validation](/middleware/validation/overview) contract runs once the body is within the limit.

## Error Handling

When the limit is exceeded, the middleware fails with status **413** and message `Request body exceeds <limit> bytes limit`. That failure routes through the [central error handler](/error-handling/object-details) like any other, so shape the response there or rely on the [default behavior](/error-handling/default-behavior). A `body:rejected` observability event also fires with the limit and the declared size, covered in [Event Reference](/middleware/observability/events).
