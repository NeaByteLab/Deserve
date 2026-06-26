---
description: "Why Deserve has no built-in rate limiter, and how to compose one from global middleware and Context."
---

# Rate Limiting

Deserve ships no rate limiter, and that is a choice rather than a missing feature.

## Why It Is Not Built In

Rate limiting looks like one feature, but every team wants a different shape. One project counts by IP, another by API key, another by user ID after login. One stores counters in memory, another in [Redis](https://redis.io/), another in a database that already tracks usage for billing. The window can be fixed, sliding, or a token bucket, and the response on a block can be a `429`, a redirect, or a quiet drop.

A single built-in answer would fit one taste and fight every other one. So the decision is to stay out of the way. Deserve already exposes a full request lifecycle through [global middleware](/middleware/global) and the [Context object](/core-concepts/context-object), and a limiter is a small composition on top of those parts. The framework hands over the hooks, and the rule stays where it belongs, in the hands of the developer.

## The Pieces Already in Place

A limiter needs four things, and each one already ships:

- **A key per client** - read `ctx.get.ip()` for the resolved visitor IP, or `ctx.get.header('x-api-key')` for an API key. See [`ctx.get.ip()`](/core-concepts/context-object#ctx-get-ip-options).
- **A place to run early** - [global middleware](/middleware/global) runs before every route handler and can stop a request by returning a `Response`.
- **A way to block** - return `ctx.send.text(...)` or `ctx.send.json(...)` with status `429` to end the request right there.
- **A way to inform** - `ctx.set.header(...)` adds the standard rate limit headers so a client can back off.

## A Fixed Window Limiter

This middleware counts requests per IP inside a fixed time window. When the count passes the limit, the request stops with a `429`.

```typescript twoslash
import { Router, type Context } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Tune the window and the cap
const windowMs = 60_000
const maxRequests = 100

// Track count and reset per key
const hits = new Map<string, { count: number, resetAt: number }>()

router.use(async (ctx, next) => {
  // Pick the client key
  const key = ctx.get.ip() ?? 'unknown'
  const now = Date.now()
  const entry = hits.get(key)

  // Fresh window when missing or expired
  if (!entry || now > entry.resetAt) {
    hits.set(key, {
      count: 1,
      resetAt: now + windowMs
    })
    return await next()
  }

  // Within the window, count this hit
  entry.count++

  // Over the cap, block with 429
  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    ctx.set.header('Retry-After', String(retryAfter))
    return ctx.send.text(
      'Too Many Requests',
      {
        status: 429
      }
    )
  }

  // Still under the cap, continue
  return await next()
})

await router.serve(8000)
```

The `Map` lives in memory, so the count resets when the process restarts and is not shared across multiple instances. For a single server that is enough. For a fleet, swap the `Map` for a shared store like Redis and keep the rest of the shape.

## Telling the Client What Is Left

Clients behave better when they can see their budget. The standard headers report the cap, the remaining hits, and when the window resets. Set them on every response, not only on a block.

```typescript twoslash
import { Router, type Context } from '@neabyte/deserve'

const router = new Router()
const windowMs = 60_000
const maxRequests = 100
const hits = new Map<string, { count: number, resetAt: number }>()
// ---cut---
router.use(async (ctx, next) => {
  const key = ctx.get.ip() ?? 'unknown'
  const now = Date.now()
  let entry = hits.get(key)

  // Start a fresh window when needed
  if (!entry || now > entry.resetAt) {
    entry = {
      count: 0,
      resetAt: now + windowMs
    }
    hits.set(key, entry)
  }

  entry.count++
  const remaining = Math.max(0, maxRequests - entry.count)

  // Report the budget on every response
  ctx.set.headers({
    'X-RateLimit-Limit': String(maxRequests),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(Math.ceil(entry.resetAt / 1000))
  })

  // Block once the cap is passed
  if (entry.count > maxRequests) {
    return ctx.send.json(
      {
        error: 'Too Many Requests'
      },
      {
        status: 429
      }
    )
  }

  return await next()
})
```

## Limiting Only Some Routes

A login form needs a tighter limit than a public page. Path-specific middleware applies the rule to one prefix and leaves the rest untouched.

```typescript twoslash
import { Router, type Context } from '@neabyte/deserve'

const router = new Router()
declare function isOverLimit(key: string): boolean
// ---cut---
// Guard only the auth routes
router.use('/auth', async (ctx, next) => {
  const key = ctx.get.ip() ?? 'unknown'
  if (isOverLimit(key)) {
    return ctx.send.json(
      {
        error: 'Slow down'
      },
      {
        status: 429
      }
    )
  }
  return await next()
})
```

This is the same path-specific form covered in [global middleware](/middleware/global#path-specific-middleware), now carrying a limit instead of an auth check.

## Shaping the Block Response

The examples above return the `429` straight from the middleware. To route every block through one place, throw inside [`Wrap.apply`](/middleware/global#wrapping-middleware-with-error-handling) and shape the reply with [`router.catch()`](/error-handling/object-details). That keeps the limit rule and the error format apart, which helps when several middlewares share one response style.

## Watching the Limit Work

The limiter blocks requests, and the [observability events](/middleware/observability/overview) report what happened. A blocked request finishes with status `429`, so it arrives as a `request:failed` event. Subscribe once to count blocks or trace which keys hit the cap.

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
router.on((event) => {
  // Log every request that was blocked
  if (event.kind === 'request:failed' && event.metadata.statusCode === 429) {
    console.log('Rate limited:', event.metadata.ip, event.metadata.url)
  }
})
```

See the [Event Reference](/middleware/observability/events#requests) for the full metadata on request events.
