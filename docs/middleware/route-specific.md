---
description: "Scope middleware to a path prefix so it runs only for matching routes."
---

# Route-Specific Middleware

Route-specific middleware applies to specific route patterns, allowing targeted functionality like authentication for API routes or logging for admin routes.

## Basic Usage

Apply middleware to specific route patterns using the `use()` method with a route path:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()

// Runs for paths starting with /api
router.use('/api', async (ctx, next) => {
  console.log(`API request: ${ctx.request.method} ${ctx.url}`)
  return await next()
})

await router.serve(8000)
```

## Route Pattern Matching

Middleware applies to routes that start with the specified pattern:

```typescript twoslash
import type { MiddlewareFn } from '@neabyte/deserve'
import { Router } from '@neabyte/deserve'

const router = new Router()
declare const middleware: MiddlewareFn
// ---cut---
// Applies to /api/* routes
router.use('/api', middleware)

// Applies to /api/users/* routes
router.use('/api/users', middleware)

// Applies to /admin/* routes
router.use('/admin', middleware)
```

## Common Route-Specific Patterns

### API Authentication

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
declare function isValidToken(token: string): boolean
// ---cut---
// Require a bearer token under /api
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

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Allow only the admin role under /admin
router.use('/admin', async (ctx, next) => {
  const userRole = ctx.header('x-user-role')
  if (userRole !== 'admin') {
    return ctx.send.text('Admin access required', { status: 403 })
  }
  return await next()
})
```

### Public Route Logging

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Log access under /public
router.use('/public', async (ctx, next) => {
  console.log(`Public access: ${ctx.request.method} ${ctx.url}`)
  return await next()
})
```

### Version-Specific Middleware

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Separate middleware per API version
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

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Auth runs first under /api
router.use('/api', async (ctx, next) => {
  const authHeader = ctx.header('authorization')
  if (!authHeader) {
    return ctx.send.text('Unauthorized', { status: 401 })
  }
  return await next()
})

// Logging runs after auth passes
router.use('/api', async (ctx, next) => {
  console.log(`API: ${ctx.request.method} ${ctx.url}`)
  return await next()
})
```

## Nested Route Patterns

Apply middleware to nested route patterns:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Covers every path under /api
router.use('/api', async (ctx, next) => {
  console.log('API request')
  return await next()
})

// Narrows to /api/users
router.use('/api/users', async (ctx, next) => {
  console.log('User API request')
  return await next()
})

// Narrows further and checks role
router.use('/api/users/admin', async (ctx, next) => {
  const role = ctx.header('x-user-role')
  if (role !== 'admin') {
    return ctx.send.text('Admin access required', { status: 403 })
  }
  return await next()
})
```

## Middleware Execution Order

Middleware runs in the order it is added:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Global runs for every request
router.use(async (ctx, next) => {
  console.log('Global middleware')
  return await next()
})

// Path middleware runs for /api requests
router.use('/api', async (ctx, next) => {
  console.log('API middleware')
  return await next()
})

// For /api/users: global, then API, then handler
```
