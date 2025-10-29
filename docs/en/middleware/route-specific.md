# Route-Specific Middleware

Route-specific middleware applies to specific route patterns, allowing targeted functionality like authentication for API routes or logging for admin routes.

## Basic Usage

Apply middleware to specific route patterns using the `use()` method with a route path:

```typescript
import { Router } from '@neabyte/deserve'

const router = new Router()

// Route-specific middleware for /api/* routes
router.use('/api', async (ctx, next) => {
  console.log(`API request: ${ctx.request.method} ${ctx.url}`)
})

await router.serve(8000)
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
router.use('/api', async (ctx, next) => {
  const authHeader = ctx.header('authorization')
  if (!authHeader) {
    return ctx.send.text('API requires authentication', { status: 401 })
  }
  // Validate token
  const token = authHeader.replace('Bearer ', '')
  if (!isValidToken(token)) {
    return ctx.send.text('Invalid token', { status: 401 })
  }
  // Context not modified, Handler automatically calls next()
})
```

### Admin Authorization
```typescript
// Require admin role for admin routes
router.use('/admin', async (ctx, next) => {
  const userRole = ctx.header('x-user-role')
  if (userRole !== 'admin') {
    return ctx.send.text('Admin access required', { status: 403 })
  }
  // Context not modified, Handler automatically calls next()
})
```

### Public Route Logging
```typescript
// Log all public route access
router.use('/public', async (ctx, next) => {
  console.log(`Public access: ${ctx.request.method} ${ctx.url}`)
})
```

### Version-Specific Middleware
```typescript
// Different middleware for API versions
router.use('/api/v1', async (ctx, next) => {
  // Legacy API behavior
  console.log('Legacy API v1 request')
})

router.use('/api/v2', async (ctx, next) => {
  // Modern API behavior
  console.log('Modern API v2 request')
})
```

## Multiple Route-Specific Middleware

Apply multiple middleware to the same route pattern:

```typescript
// Authentication middleware for API routes
router.use('/api', async (ctx, next) => {
  const authHeader = ctx.header('authorization')
  if (!authHeader) {
    return ctx.send.text('Unauthorized', { status: 401 })
  }
})

// Logging middleware for API routes
router.use('/api', async (ctx, next) => {
  console.log(`API: ${ctx.request.method} ${ctx.url}`)
})
```

## Nested Route Patterns

Apply middleware to nested route patterns:

```typescript
// General API middleware
router.use('/api', async (ctx, next) => {
  console.log('API request')
})

// Specific middleware for user routes
router.use('/api/users', async (ctx, next) => {
  console.log('User API request')
})

// Admin-specific middleware for user management
router.use('/api/users/admin', async (ctx, next) => {
  const role = ctx.header('x-user-role')
  if (role !== 'admin') {
    return ctx.send.text('Admin access required', { status: 403 })
  }
})
```

## Middleware Execution Order

Middleware executes in the order it's added:

```typescript
// Global middleware added first
router.use(async (ctx, next) => {
  console.log('Global middleware')
})

// Route-specific middleware added second
router.use('/api', async (ctx, next) => {
  console.log('API middleware')
})

// Execution order for /api/users:
// 1. Global middleware (added first)
// 2. API middleware (route-specific, added second)
// 3. Route handler
```

