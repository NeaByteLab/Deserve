# Route-Specific Middleware

Route-specific middleware applies to specific route patterns, allowing targeted functionality like authentication for API routes or logging for admin routes.

## Basic Usage

Apply middleware to specific route patterns using the `use()` method with a route path:

```typescript
// 1. Import Router
import { Router } from '@neabyte/deserve'

// 2. Create router
const router = new Router()

// 3. Apply middleware for paths starting with /api (prefix match)
router.use('/api', async (ctx, next) => {
  console.log(`API request: ${ctx.request.method} ${ctx.url}`)
  return await next()
})

// 4. Start server
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
// 1. Auth only for /api
router.use('/api', async (ctx, next) => {
  const authHeader = ctx.header('authorization')
  if (!authHeader) {
    return ctx.send.text('API requires authentication', { status: 401 })
  }
  const token = authHeader.replace('Bearer ', '')
  if (!isValidToken(token)) {
    return ctx.send.text('Invalid token', { status: 401 })
  }
  return await next()
})
```

### Admin Authorization

```typescript
// 1. Check admin role for /admin
router.use('/admin', async (ctx, next) => {
  const userRole = ctx.header('x-user-role')
  if (userRole !== 'admin') {
    return ctx.send.text('Admin access required', { status: 403 })
  }
  return await next()
})
```

### Public Route Logging

```typescript
// 1. Log access to /public
router.use('/public', async (ctx, next) => {
  console.log(`Public access: ${ctx.request.method} ${ctx.url}`)
  return await next()
})
```

### Version-Specific Middleware

```typescript
// 1. Middleware per API version
router.use('/api/v1', async (ctx, next) => {
  console.log('Legacy API v1 request')
  return await next()
})

router.use('/api/v2', async (ctx, next) => {
  console.log('Modern API v2 request')
  return await next()
})
```

## Multiple Route-Specific Middleware

Apply multiple middleware to the same route pattern:

```typescript
// 1. Auth first for /api
router.use('/api', async (ctx, next) => {
  const authHeader = ctx.header('authorization')
  if (!authHeader) {
    return ctx.send.text('Unauthorized', { status: 401 })
  }
  return await next()
})

// 2. Then logging (runs after auth ok)
router.use('/api', async (ctx, next) => {
  console.log(`API: ${ctx.request.method} ${ctx.url}`)
  return await next()
})
```

## Nested Route Patterns

Apply middleware to nested route patterns:

```typescript
// 1. /api → all paths under /api
router.use('/api', async (ctx, next) => {
  console.log('API request')
  return await next()
})

// 2. /api/users → more specific
router.use('/api/users', async (ctx, next) => {
  console.log('User API request')
  return await next()
})

// 3. /api/users/admin → check role
router.use('/api/users/admin', async (ctx, next) => {
  const role = ctx.header('x-user-role')
  if (role !== 'admin') {
    return ctx.send.text('Admin access required', { status: 403 })
  }
  return await next()
})
```

## Middleware Execution Order

Middleware executes in the order it's added:

```typescript
// 1. Global: runs for every request
router.use(async (ctx, next) => {
  console.log('Global middleware')
  return await next()
})

// 2. Path /api: runs if path starts with /api
router.use('/api', async (ctx, next) => {
  console.log('API middleware')
  return await next()
})

// Execution order for request to /api/users:
// 1. Global middleware (added first)
// 2. API middleware (route-specific, added second)
// 3. Route handler
```
