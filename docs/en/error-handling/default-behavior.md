# Default Error Behavior

**TL;DR**: This error handling mechanism catches all errors that occur during server runtime. This includes route handler errors, middleware failures, route not found scenarios, static file errors, and any other uncaught exceptions during request processing. If you don't define a custom error handler with `router.catch()`, Deserve automatically uses this default behavior to ensure your server never crashes from unhandled errors.

```mermaid
flowchart LR
    A[Error Occurs] --> B{router.catch defined?}
    B -->|No| C[Default Handler]
    B -->|Yes| D[Custom Handler]
    C --> E[JSON or HTML by Accept]
    D --> F
    E --> F[Return Response]
```

## Basic Default Behavior

If you don't call `router.catch()`, Deserve automatically handles all errors with a default response (JSON or HTML) and appropriate status codes:

```typescript
// 1. Import Router
import { Router } from '@neabyte/deserve'

// 2. Create router
const router = new Router({ routesDir: './routes' })

// 3. Do not call router.catch() — errors use default response (JSON/HTML by Accept)

// 4. Start server
await router.serve(8000)
```

## Default Error Response

The default error response (without custom `router.catch()`) follows the client's `Accept` header:

- **Accept includes `application/json`** → JSON body: `{ error, path, statusCode }`
- **Otherwise** → HTML body: simple error page with status and message (escaped)

Also:

- **Status Code**: Preserves the original error status code (404, 500, etc.)
- **Headers**: Includes headers set via `ctx.setHeader()` before the error

```typescript
// Example default response (client requests JSON)
// Status: 404
// Body: { "error": "...", "path": "/api/foo", "statusCode": 404 }

// Example default response (client does not request JSON)
// Status: 404
// Body: HTML with <title>404</title> and error message
```

## Error Scenarios

Default error handling covers all error types that can occur during request processing:

### 404 - Route Not Found

When a route doesn't exist or no matching route handler is found:

```typescript
// GET /nonexistent
// Status: 404
// Body: JSON or HTML (by Accept header)
// Headers: {}
```

This includes:

- Non-existent routes
- Routes with incorrect HTTP methods
- Routes that fail to match during routing resolution

### 500 - Server Errors

When a route handler throws any error or exception:

```typescript
export function GET(ctx: Context): Response {
  // 1. Throw error → caught by Deserve
  throw new Error('Something went wrong')
  // 2. Default response: Status 500, JSON/HTML body (without router.catch)
}
```

This covers:

- Uncaught exceptions in route handlers
- Runtime errors (TypeError, ReferenceError, etc.)
- Async operation failures
- Any error thrown during handler execution

### Middleware Errors

When middleware functions throw errors or fail:

```typescript
// 1. Middleware throws → error caught
router.use(async (ctx, next) => {
  throw new Error('Middleware failed')
  // 2. Default response: Status 500, JSON/HTML body
})
```

All middleware errors are caught and handled by the default error handler.

### Static File Errors

When serving static files encounters issues:

```typescript
// 1. Mount static files at /static
router.static('/static', { path: './public' })

// 2. If file not found (GET /static/missing.jpg):
//    Status: 404, Body: JSON/HTML per Accept
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
