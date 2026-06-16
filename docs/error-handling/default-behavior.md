---
description: "How Deserve handles uncaught errors by default and the responses it produces."
---

# Default Error Behavior

This error handling mechanism catches every error that occurs during server runtime, which covers route handler errors, middleware failures, route not found scenarios, static file errors, and any other uncaught exception during request processing. Without a custom error handler set through `router.catch()`, Deserve falls back to this default behavior so the server never crashes from unhandled errors.

![When an error occurs, the request routes to a custom handler if router.catch is defined, otherwise to the default handler that returns JSON or HTML by Accept, then a single response](/diagrams/default-error-behavior.png)

## Basic Default Behavior

Without a call to `router.catch()`, Deserve handles every error with a default response, JSON or HTML, and the matching status code:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routesDir: './routes'
})

// No router.catch, defaults take over

await router.serve(8000)
```

## Default Error Response

The default error response (without custom `router.catch()`) follows the client's `Accept` header:

- **Accept includes `application/json` or `application/problem+json`** → a problem-details body `{ type, title, status, instance }` sent as `application/problem+json`
- **Otherwise** → HTML body: simple error page with status and message (escaped)

Also:

- **Status Code**: Preserves the original error status code (404, 500, etc.)
- **Headers**: Includes headers set via `ctx.setHeader()` before the error

```typescript
// Example default response (client requests JSON)
// Status: 404
// Content-Type: application/problem+json
// Body: { "type": "about:blank", "title": "Not Found", "status": 404, "instance": "/api/foo" }

// Example default response (client does not request JSON)
// Status: 404
// Body: HTML with <title>404</title> and error message
```

The problem-details shape follows [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457), where `type` is a problem URI, `title` is a short summary, `status` repeats the code, and `instance` carries the request path. A custom `router.catch()` replaces this body with whatever shape suits the client, covered in [Error Object Details](/error-handling/object-details).

## Error Scenarios

Default error handling covers all error types that can occur during request processing:

### 404 - Route Not Found

When no route matches the request path at all:

```typescript
// GET /nonexistent
// Status: 404
// Body: JSON or HTML (by Accept header)
// Headers: {}
```

This includes:

- Non-existent routes
- Paths that match no pattern during routing resolution

### 405 - Method Not Allowed

When the path matches a route but the method has no handler, the response is `405` with an `Allow` header listing the supported methods:

```typescript
// DELETE /users (only GET and POST defined)
// Status: 405
// Body: JSON or HTML (by Accept header)
// Headers: { Allow: "GET, HEAD, POST" }
```

`HEAD` is added automatically whenever a `GET` handler exists.

### 422 - Validation Failed

When a [validation](/middleware/validation/overview) contract rejects request input, the default response adds an `errors` array listing each failure reason:

```typescript
// POST /users with an invalid body
// Status: 422
// Content-Type: application/problem+json
// Body: { "type": "about:blank", "title": "...", "status": 422,
//         "instance": "/users", "errors": ["name must not be empty"] }
```

Only a 422 carries `errors`, and every other status keeps a reason-free body. How a contract produces those reasons lives in [Reading Validated Data](/middleware/validation/reading-data#how-failures-surface).

### 500 - Server Errors

When a route handler throws any error or exception:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Throwing is caught by Deserve
  throw new Error('Something went wrong')
  // Default reply is 500 JSON or HTML
}
```

This covers:

- Uncaught exceptions in route handlers
- Runtime errors (TypeError, ReferenceError, etc.)
- Async operation failures
- Any error thrown during handler execution

### Middleware Errors

When middleware functions throw errors or fail:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// A throwing middleware is caught too
router.use(async (ctx, next) => {
  throw new Error('Middleware failed')
  // Default reply is 500 JSON or HTML
})
```

All middleware errors are caught and handled by the default error handler.

### Static File Errors

When serving static files encounters issues:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Serve static files at /static
router.static(
  '/static',
  {
    path: './public'
  }
)

// Missing file (GET /static/missing.jpg):
//   Status 404, JSON or HTML per Accept
```

This includes:

- File not found errors (404)
- File read permission errors (500)
- Filesystem operation failures (500)
- Invalid path resolution errors (500)

### Request Processing Errors

Any unexpected errors during request handling:

```typescript
// Errors in:
// - URL parsing
// - Context creation
// - Route matching
// - Response generation
// All default to: Status 500, JSON or HTML body (by Accept)
```

### Error Handling Guarantees

The default error handler ensures:

- **No server crashes**: All errors are caught and converted to HTTP responses
- **Consistent behavior**: Same error response format across all error types
- **Header preservation**: Headers set before the error are retained in the response
- **Status code accuracy**: Original error status codes (404, 500, etc.) are preserved
