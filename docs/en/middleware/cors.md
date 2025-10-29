# CORS Middleware

> **Reference**: [MDN HTTP CORS Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)

CORS (Cross-Origin Resource Sharing) middleware handles cross-origin requests by adding appropriate headers and handling preflight OPTIONS requests.

## Basic Usage

Apply CORS middleware using Deserve's built-in middleware:

```typescript
import { Router, Mware } from '@neabyte/deserve'

const router = new Router()

// Apply CORS with default settings (allows all origins)
router.use(Mware.cors())

await router.serve(8000)
```

## Custom CORS Configuration

Configure CORS with custom options:

```typescript
import { Router, Mware } from '@neabyte/deserve'

const router = new Router()

router.use(
  Mware.cors({
    origin: ['http://localhost:3000', 'https://example.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Custom-Header'],
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
origin: ['https://example.com', 'https://app.example.com']

// Allow all origins (default)
origin: '*'
```

### `methods`
Specify allowed HTTP methods:

```typescript
methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
```

### `allowedHeaders`
Specify allowed headers:

```typescript
allowedHeaders: ['Content-Type', 'Authorization', 'X-Custom-Header']
```

### `exposedHeaders`
Specify headers exposed to client:

```typescript
exposedHeaders: ['X-Total-Count', 'X-Page-Count']
```

### `credentials`
Allow credentials in requests:

```typescript
credentials: true // Allow cookies and authorization headers
```

### `maxAge`
Set preflight cache duration in seconds:

```typescript
maxAge: 3600 // Cache preflight requests for 1 hour
```

## Complete Example

```typescript
import { Router, Mware } from '@neabyte/deserve'

const router = new Router({ routesDir: './routes' })

// Apply CORS middleware with production-ready configuration
router.use(
  Mware.cors({
    origin: ['http://localhost:3000', 'http://localhost:5173', 'https://yourdomain.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Custom-Header'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    credentials: true,
    maxAge: 3600
  })
)

await router.serve(8000)
```

## Common CORS Headers

### Request Headers
- `Origin` - The origin making the request
- `Access-Control-Request-Method` - Method for preflight requests
- `Access-Control-Request-Headers` - Headers for preflight requests

### Response Headers
- `Access-Control-Allow-Origin` - Allowed origins
- `Access-Control-Allow-Methods` - Allowed HTTP methods
- `Access-Control-Allow-Headers` - Allowed request headers
- `Access-Control-Allow-Credentials` - Allow credentials
- `Access-Control-Max-Age` - Preflight cache duration
- `Access-Control-Expose-Headers` - Headers exposed to client
