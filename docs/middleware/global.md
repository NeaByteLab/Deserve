---
description: "Register global middleware that runs for every request with router.use()."
---

# Global Middleware

Global middleware executes for every request before route handlers, providing cross-cutting functionality like authentication, logging, and CORS.

## Basic Usage

Add global middleware using the `use()` method:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()

// Log every request, then continue
router.use(async (ctx, next) => {
  console.log(`${ctx.request.method} ${ctx.url}`)
  return await next()
})

await router.serve(8000)
```

## Middleware Function Signature

```typescript
type MiddlewareFn = (
  ctx: Context,
  next: () => Promise<Response | undefined>
) => Response | undefined | Promise<Response | undefined>
```

- **Return `await next()`** - continue to the next middleware or route handler, which allows response modification and inspection.
- **Return `Response`** - stop processing and return that response immediately.
- **Return `undefined`** - treated as pass-through so the chain continues as if `next()` were called.

Middleware must either call `next()` and use its result or return a `Response`. When it does neither, for example never calling `next()` and returning nothing, the request can hang, so `requestTimeoutMs` in `Router` caps the request duration and returns a 503 instead.

## Common Global Middleware Patterns

### Request Logging

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
router.use(async (ctx, next) => {
  const start = Date.now()
  console.log(`${ctx.request.method} ${ctx.url} - ${new Date().toISOString()}`)
  const response = await next()
  const duration = Date.now() - start
  console.log(`Completed in ${duration}ms`)
  return response
})
```

### Authentication

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
declare function isValidToken(token: string): boolean
// ---cut---
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

Custom middleware that throws can be wrapped with `WrapMware`, so errors are caught and passed to `router.catch()` when it is defined:

```typescript twoslash
import { Router, WrapMware } from '@neabyte/deserve'

const router = new Router()

// Wrap so throws reach router.catch
const myAuth = WrapMware('Auth', async (ctx, next) => {
  if (!ctx.header('x-api-key')) {
    throw new Error('Missing API key')
  }
  return await next()
})

// Apply middleware and the error handler
router.use(myAuth)
router.catch((ctx, err) => ctx.send.json({ error: err.error?.message }, { status: 500 }))

await router.serve(8000)
```

**Signature:** `WrapMware(label: string, middleware: MiddlewareFn): MiddlewareFn`. When the middleware throws, the error runs through `ctx.handleError()` so `router.catch()` is invoked.

## Path-Specific Middleware

Middleware also applies to specific paths:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
import { Router } from '@neabyte/deserve'

const router = new Router()
declare function isAuthenticated(ctx: Context): boolean
// ---cut---
// Runs only for /api paths
router.use('/api', async (ctx, next) => {
  console.log('API request:', ctx.url)
  return await next()
})

// Guard /admin paths with an auth check
router.use('/admin', async (ctx, next) => {
  if (!isAuthenticated(ctx)) {
    return ctx.send.text('Unauthorized', { status: 401 })
  }
  return await next()
})
```
