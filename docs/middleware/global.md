# Global Middleware

Global middleware executes for every request before route handlers, providing cross-cutting functionality like authentication, logging, and CORS.

## Basic Usage

Add global middleware using the `use()` method:

```typescript
import { Router } from '@neabyte/deserve'

const router = new Router()

// Global middleware
router.use((req: Request) => {
  console.log(`${req.method} ${req.url}`)
  return null // Continue to next middleware/route
})

router.serve(8000)
```

## Middleware Function Signature

```typescript
type RouterMiddleware = (req: Request, res?: Response) => Response | null
```

- **Return `null`** - Continue to next middleware or route handler
- **Return `Response`** - Stop processing and return response immediately

## Common Global Middleware Patterns

### Request Logging
```typescript
router.use((req: Request) => {
  const start = Date.now()
  console.log(`🌐 ${req.method} ${req.url} - ${new Date().toISOString()}`)
  // You can also log response time by modifying the response
  return null
})
```

### Authentication
```typescript
router.use((req: Request) => {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Bearer' }
    })
  }
  // Validate token here...
  const token = authHeader.replace('Bearer ', '')
  if (!isValidToken(token)) {
    return new Response('Invalid token', { status: 401 })
  }
  return null // Continue if authenticated
})
```

### Rate Limiting
```typescript
const requestCounts = new Map<string, { count: number; resetTime: number }>()

router.use((req: Request) => {
  const clientIP = req.headers.get('X-Forwarded-For') || 'unknown'
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute
  const maxRequests = 100
  const current = requestCounts.get(clientIP)
  if (!current || now > current.resetTime) {
    requestCounts.set(clientIP, { count: 1, resetTime: now + windowMs })
    return null
  }
  if (current.count >= maxRequests) {
    return new Response('Too Many Requests', {
      status: 429,
      headers: { 'Retry-After': '60' }
    })
  }
  current.count++
  return null
})
```

### Request Body Parsing
```typescript
router.use(async (req: Request) => {
  // Add parsed body to request for easy access
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const contentType = req.headers.get('Content-Type')
    if (contentType?.includes('application/json')) {
      try {
        const body = await req.json()
        // You can attach this to the request object or store it elsewhere
        // Note: This consumes the request body, so route handlers won't be able to read it again
      } catch (error) {
        return new Response('Invalid JSON', { status: 400 })
      }
    }
  }
  return null
})
```

## Best Practices

1. **Order matters** - Middleware executes in the order it's added
2. **Return early** - Return a Response to stop processing
3. **Handle errors** - Wrap async operations in try-catch
4. **Keep it focused** - One responsibility per middleware
5. **Use built-ins** - Leverage Deserve's built-in middleware when possible
6. **Performance** - Avoid expensive operations in global middleware
7. **Logging** - Add logging for debugging and monitoring

## Next Steps

- [Route-Specific Middleware](/middleware/route-specific) - Targeted middleware
- [CORS Middleware](/middleware/cors) - Cross-origin request handling
- [Error Handling](/error-handling/object-details) - Custom error responses
