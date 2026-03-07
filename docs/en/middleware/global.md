# Global Middleware

Global middleware executes for every request before route handlers, providing cross-cutting functionality like authentication, logging, and CORS.

## Basic Usage

Add global middleware using the `use()` method:

```typescript
// 1. Import Router
import { Router } from '@neabyte/deserve'

// 2. Create router
const router = new Router()

// 3. Add global middleware: log each request, then continue
router.use(async (ctx, next) => {
  console.log(`${ctx.request.method} ${ctx.url}`)
  return await next()
})

// 4. Start server
await router.serve(8000)
```

## Middleware Function Signature

```typescript
type Middleware = (
  ctx: Context,
  next: () => Promise<Response | undefined>
) => Response | Promise<Response | undefined>
```

- **Return `await next()`** - Continue to next middleware or route handler; allows response modification and inspection.
- **Return `Response`** - Stop processing and return that response immediately.
- **Return `undefined`** - Treated as pass-through (chain continues as if `next()` were called).

Middleware must either call `next()` and use its result or return a `Response`. If it does neither (e.g. never calls `next()` and returns nothing), the request can hang; use `requestTimeoutMs` in `Router` to cap request duration and get a 503 instead.

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
  return await next()
})
```

## Wrapping Middleware With Error Handling

Custom middleware that throws can be wrapped with `wrapMiddleware` so errors are caught and passed to `router.catch()` (if defined):

```typescript
// 1. Import Router, wrapMiddleware (and Mware if needed)
import { Router, wrapMiddleware, Mware } from '@neabyte/deserve'

// 2. Create router
const router = new Router()

// 3. Wrap middleware with label; errors go to router.catch
const myAuth = wrapMiddleware('Auth', async (ctx, next) => {
  if (!ctx.header('x-api-key')) {
    throw new Error('Missing API key')
  }
  return await next()
})

// 4. Apply middleware and error handler
router.use(myAuth)
router.catch((ctx, err) => ctx.send.json({ error: err.error?.message }, { status: 500 }))

// 5. Start server
await router.serve(8000)
```

**Signature:** `wrapMiddleware(label: string, middleware: Middleware): Middleware`. If the middleware throws, the error is processed via `ctx.handleError()` so `router.catch()` is invoked.

## Path-Specific Middleware

You can apply middleware to specific paths:

```typescript
// 1. Middleware only for paths starting with /api
router.use('/api', async (ctx, next) => {
  console.log('API request:', ctx.url)
  return await next()
})

// 2. Middleware for /admin paths: check auth first
router.use('/admin', async (ctx, next) => {
  if (!isAuthenticated(ctx)) {
    return ctx.send.text('Unauthorized', { status: 401 })
  }
  return await next()
})
```
