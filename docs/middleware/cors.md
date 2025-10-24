# CORS Middleware

CORS (Cross-Origin Resource Sharing) middleware handles cross-origin requests by adding appropriate headers and handling preflight OPTIONS requests.

## Basic Usage

Apply CORS middleware using Deserve's built-in middleware:

```typescript
import { Router } from '@neabyte/deserve'

const router = new Router()

// Apply CORS with default settings
router.apply(['cors'])

router.serve(8000)
```

## Custom CORS Configuration

Configure CORS with custom options:

```typescript
router.apply([['cors', {
  origin: ['https://example.com', 'https://app.example.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  headers: ['Content-Type', 'Authorization', 'X-Custom-Header'],
  credentials: true,
  maxAge: 3600
}]])
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

### `headers`
Specify allowed headers:

```typescript
headers: ['Content-Type', 'Authorization', 'X-Custom-Header']
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

## Best Practices

1. **Be specific with origins** - Avoid using `*` in production
2. **Use credentials carefully** - Only with trusted origins
3. **Set appropriate maxAge** - Balance caching with flexibility
4. **Validate origins** - Check against allowlist
5. **Handle preflight requests** - Always respond to OPTIONS
6. **Use environment variables** - Different settings per environment
7. **Test thoroughly** - Verify CORS behavior across browsers

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

## Troubleshooting

### Common Issues

**CORS errors in browser console:**
- Check origin configuration
- Verify preflight handling
- Ensure credentials settings match

**Preflight requests failing:**
- Handle OPTIONS method
- Set appropriate headers
- Check maxAge setting

**Credentials not working:**
- Set `Access-Control-Allow-Credentials: true`
- Use specific origins (not `*`)
- Include credentials headers

## Next Steps

- [Global Middleware](/middleware/global) - Cross-cutting functionality
- [Route-Specific Middleware](/middleware/route-specific) - Targeted middleware
- [Error Handling](/error-handling/object-details) - Custom error responses
