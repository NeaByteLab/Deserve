# Route-Specific Middleware

Route-specific middleware applies to specific route patterns, allowing targeted functionality like authentication for API routes or logging for admin routes.

## Basic Usage

Apply middleware to specific route patterns using the `use()` method with a route path:

```typescript
import { Router } from '@neabyte/deserve'

const router = new Router()

// Route-specific middleware for /api/* routes
router.use('/api', (req: Request) => {
  console.log(`API request: ${req.method} ${req.url}`)
  return null // Continue to next middleware/route
})

router.serve(8000)
```

## Route Pattern Matching

Middleware applies to routes that start with the specified pattern:

```typescript
// Applies to /api/* routes
router.use('/api', middleware)

// Applies to /api/users/* routes
router.use('/api/users', middleware)

// Applies to /admin/* routes
router.use('/admin', middleware)
```

## Common Route-Specific Patterns

### API Authentication
```typescript
// Require authentication for all API routes
router.use('/api', (req: Request) => {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('API requires authentication', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Bearer' }
    })
  }
  // Validate token
  const token = authHeader.replace('Bearer ', '')
  if (!isValidToken(token)) {
    return new Response('Invalid token', { status: 401 })
  }
  return null // Continue if authenticated
})
```

### Admin Authorization
```typescript
// Require admin role for admin routes
router.use('/admin', (req: Request) => {
  const userRole = req.headers.get('X-User-Role')
  if (userRole !== 'admin') {
    return new Response('Admin access required', { status: 403 })
  }
  return null
})
```

### Public Route Logging
```typescript
// Log all public route access
router.use('/public', (req: Request) => {
  console.log(`Public access: ${req.method} ${req.url}`)
  return null
})
```

### Version-Specific Middleware
```typescript
// Different middleware for API versions
router.use('/api/v1', (req: Request) => {
  // Legacy API behavior
  console.log('Legacy API v1 request')
  return null
})

router.use('/api/v2', (req: Request) => {
  // Modern API behavior
  console.log('Modern API v2 request')
  return null
})
```

## Multiple Route-Specific Middleware

Apply multiple middleware to the same route pattern:

```typescript
// Authentication middleware for API routes
router.use('/api', (req: Request) => {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401 })
  }
  return null
})

// Rate limiting middleware for API routes
router.use('/api', (req: Request) => {
  if (isRateLimited(req)) {
    return new Response('Too Many Requests', { status: 429 })
  }
  return null
})

// Logging middleware for API routes
router.use('/api', (req: Request) => {
  console.log(`API: ${req.method} ${req.url}`)
  return null
})
```

## Nested Route Patterns

Apply middleware to nested route patterns:

```typescript
// General API middleware
router.use('/api', (req: Request) => {
  console.log('API request')
  return null
})

// Specific middleware for user routes
router.use('/api/users', (req: Request) => {
  console.log('User API request')
  return null
})

// Admin-specific middleware for user management
router.use('/api/users/admin', (req: Request) => {
  const role = req.headers.get('X-User-Role')
  if (role !== 'admin') {
    return new Response('Admin access required', { status: 403 })
  }
  return null
})
```

## Middleware Execution Order

Route-specific middleware executes before global middleware:

1. **Route-specific middleware** (for matching patterns)
2. **Global middleware** (for all routes)
3. **Route handlers** (execute the actual route logic)

```typescript
// Global middleware
router.use((req: Request) => {
  console.log('Global middleware')
  return null
})

// Route-specific middleware
router.use('/api', (req: Request) => {
  console.log('API middleware')
  return null
})

// Execution order for /api/users:
// 1. API middleware (route-specific)
// 2. Global middleware
// 3. Route handler
```

## Best Practices

1. **Use specific patterns** - Be precise with route patterns
2. **Order matters** - Route-specific middleware runs before global
3. **Keep it focused** - One responsibility per middleware
4. **Handle errors** - Wrap operations in try-catch
5. **Return early** - Return Response to stop processing
6. **Use descriptive patterns** - `/api/users` not `/api/u`
7. **Avoid conflicts** - Don't overlap middleware unnecessarily

## Next Steps

- [Global Middleware](/middleware/global) - Cross-cutting functionality
- [CORS Middleware](/middleware/cors) - Cross-origin request handling
- [WebSocket Middleware](/middleware/websocket) - Real-time communication
