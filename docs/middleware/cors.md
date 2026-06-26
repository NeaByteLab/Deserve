---
description: "Configure Cross-Origin Resource Sharing (CORS) policy for Deserve routes."
---

# CORS Middleware

> **Reference**: [MDN HTTP CORS Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)

CORS (Cross-Origin Resource Sharing) middleware handles cross-origin requests by adding appropriate headers and handling preflight OPTIONS requests.

## Basic Usage

Apply CORS middleware using Deserve's built-in middleware:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()

// Allow all origins, handle preflight
router.use(Mware.cors())

await router.serve(8000)
```

## Custom CORS Configuration

Configure CORS with custom options:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()

// Tune origins, methods, headers, and cache
router.use(
  Mware.cors({
    origin: [
      'http://localhost:3000',
      'https://example.com'
    ],
    methods: [
      'GET',
      'POST',
      'PUT',
      'DELETE'
    ],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Custom-Header'
    ],
    credentials: true,
    maxAge: 3600
  })
)

await router.serve(8000)
```

## CORS Options

### `origin`

Specify allowed origins:

```typescript
// Single origin
origin: 'https://example.com'

// Multiple origins
origin: [
  'https://example.com',
  'https://app.example.com'
]

// Allow all origins (default)
origin: '*'
```

### `methods`

Specify allowed HTTP methods. Defaults to all seven supported methods:

```typescript
methods: [
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'PATCH',
  'OPTIONS'
]
```

### `allowedHeaders`

Specify allowed headers. Defaults to `Content-Type`, `Authorization`, and `X-Requested-With`:

```typescript
allowedHeaders: [
  'Content-Type',
  'Authorization',
  'X-Custom-Header'
]
```

### `exposedHeaders`

Specify headers exposed to the client:

```typescript
exposedHeaders: [
  'X-Total-Count',
  'X-Page-Count'
]
```

### `credentials`

Allow credentials in requests:

```typescript
credentials: true // Allow cookies and authorization headers
```

### `maxAge`

Set preflight cache duration in seconds. Defaults to `86400` (24 hours):

```typescript
maxAge: 3600 // Cache preflight requests for 1 hour
```

### Defaults

Every option has a default, so `Mware.cors()` with no arguments allows any origin:

| Option           | Default                                            |
| ---------------- | -------------------------------------------------- |
| `origin`         | `'*'`                                              |
| `methods`        | `['DELETE', 'GET', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT']` |
| `allowedHeaders` | `['Content-Type', 'Authorization', 'X-Requested-With']` |
| `exposedHeaders` | `[]`                                               |
| `credentials`    | `false`                                            |
| `maxAge`         | `86400`                                            |

## How It Works

- **No Origin header** - the request passes through untouched, since it is not cross-origin
- **Preflight OPTIONS** - a matching origin gets a **204 No Content** with the CORS headers. A non-matching origin also gets a **204** but without any CORS headers, so the browser blocks the actual request. A `cors:blocked` event fires for the non-matching origin
- **Actual request** - a matching origin receives `Access-Control-Allow-Origin` plus credentials and exposed headers when configured. A non-matching origin gets no CORS headers and a `cors:blocked` event fires
- **Vary header** - `Vary: Origin` is added whenever `origin` is not the `'*'` wildcard, so caches stay correct

## Credentials and Wildcard

Setting `credentials: true` together with `origin: '*'` throws `Deno.errors.InvalidData` when the middleware is created, because browsers reject credentialed requests against a wildcard origin. Name explicit origins instead:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Credentials need explicit origins
router.use(
  Mware.cors({
    origin: ['https://app.example.com'],
    credentials: true
  })
)
```

## Common CORS Headers

### Request Headers

- `Origin` - the origin making the request
- `Access-Control-Request-Method` - method for preflight requests
- `Access-Control-Request-Headers` - headers for preflight requests

### Response Headers

- `Access-Control-Allow-Origin` - allowed origins
- `Access-Control-Allow-Methods` - allowed HTTP methods
- `Access-Control-Allow-Headers` - allowed request headers
- `Access-Control-Allow-Credentials` - allow credentials
- `Access-Control-Max-Age` - preflight cache duration
- `Access-Control-Expose-Headers` - headers exposed to client
