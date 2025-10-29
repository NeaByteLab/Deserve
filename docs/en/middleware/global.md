# Global Middleware

Global middleware executes for every request before route handlers, providing cross-cutting functionality like authentication, logging, and CORS.

## Basic Usage

Add global middleware using the `use()` method:

```typescript
import { Router } from '@neabyte/deserve'

const router = new Router()

router.use(async (ctx, next) => {
  console.log(`${ctx.request.method} ${ctx.url}`)
  return await next() // Continue to next middleware/route
})

router.serve(8000)
```

## Middleware Function Signature

```typescript
type Middleware = (ctx: Context, next: () => Promise<Response>) => Response | Promise<Response>
```

- **Return `await next()`** - Always called to continue to next middleware or route handler, allows response modification and inspection
- **Return `Response`** - Stop processing and return response immediately
- **Return `undefined`** - Pass through middleware (automatically calls `next()`)

## Common Global Middleware Patterns

### Request Logging
```typescript
router.use(async (ctx, next) => {
  const start = Date.now()
  console.log(`🌐 ${ctx.request.method} ${ctx.url} - ${new Date().toISOString()}`)
  const response = await next()
  const duration = Date.now() - start
  console.log(`✅ Completed in ${duration}ms`)
  return response
})
```

### Authentication
```typescript
router.use(async (ctx, next) => {
  const authHeader = ctx.header('authorization')
  if (!authHeader) {
    return ctx.send.text('Unauthorized', { status: 401 })
  }
  // Validate token here...
  const token = authHeader.replace('Bearer ', '')
  if (!isValidToken(token)) {
    return ctx.send.text('Invalid token', { status: 401 })
  }
  // Context not modified, Handler automatically calls next()
})
```

## Path-Specific Middleware

You can apply middleware to specific paths:

```typescript
// Middleware only for /api routes
router.use('/api', async (ctx, next) => {
  console.log('API request:', ctx.url)
})

// Middleware for all routes starting with /admin
router.use('/admin', async (ctx, next) => {
  if (!isAuthenticated(ctx)) {
    return ctx.send.text('Unauthorized', { status: 401 })
  }
})
```
