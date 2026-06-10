---
description: "Layered error handling in Deserve to keep services available under faults."
---

# Defense in Depth

Errors in Deserve pass through several layers, and each layer is a chance to catch, shape, or record a failure. When one layer lets an error through, the next one still holds, so the server keeps responding and never crashes.

![Five layered error defenses: route handler try/catch, WrapMware labeled catch, router.catch custom handler, default handler with masked message, and the process guard that never crashes](/diagrams/defense-in-depth.png)

## Layer 1 - Route Handler

The closest layer is the handler itself. A local `try/catch` turns an expected failure into a precise response:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export async function POST(ctx: Context): Promise<Response> {
  try {
    const data = await ctx.body()
    return ctx.send.json({
      success: true
    })
  } catch (error) {
    // Handle the expected failure here
    return ctx.send.json(
      {
        error: 'Invalid body'
      },
      {
        status: 400
      }
    )
  }
}
```

Anything thrown past this point falls to the next layer.

## Layer 2 - Labeled Middleware

`WrapMware` wraps a middleware so a throw becomes a labeled error routed to the error handler. The label points straight at the failing middleware:

```typescript twoslash
import { Router, WrapMware } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Throws here reach router.catch with a label
const auth = WrapMware('Auth', async (ctx, next) => {
  if (!ctx.header('authorization')) {
    throw new Error('Missing token')
  }
  return await next()
})

router.use(auth)
```

See [Global Middleware](/middleware/global#wrapping-middleware-with-error-handling) for the full pattern.

## Layer 3 - Custom Error Handler

`router.catch()` receives every uncaught error and shapes the client response. It runs for handler errors, middleware errors, not-found, and static file errors alike:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
router.catch((ctx, error) => {
  // Shape one response for all errors
  return ctx.send.json(
    {
      error: 'Something went wrong'
    },
    {
      status: error.statusCode
    }
  )
})
```

The handler receives an error object with `statusCode`, `pathname`, `url`, `method`, and the original `error`. See [Object Details](/error-handling/object-details) for each field.

## Layer 4 - Default Handler

When no `router.catch()` is set, or the custom handler returns something other than a `Response`, Deserve falls back to the default handler. It negotiates JSON or HTML by the `Accept` header and **masks the original message**, so a thrown error never leaks its text to the client:

```typescript
// Client gets a safe, status-based message
// 500 -> "Internal Server Error"
// 404 -> "Not Found"
```

The default response also carries the built-in [security headers](/middleware/security-headers). See [Default Behavior](/error-handling/default-behavior) for the full response shape.

## Layer 5 - Process Guard

The outermost layer runs process-wide. A serving router traps unhandled rejections, uncaught errors, and blocked termination attempts, then reports each as a `process:error` event instead of letting the process die:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
router.on((event) => {
  if (event.kind === 'process:error') {
    const { origin, error } = event.metadata as { origin: string; error: Error }
    console.error(`process fault [${origin}]`, error.message)
  }
})
```

This is the safety net behind everything else. See [Process Protection](/getting-started/server-configuration#process-protection) for what it blocks and why, and [Error Reporting](/middleware/observability/errors) for how to capture these.

## Recording Across Layers

Shaping a response and recording a failure are separate jobs. `router.catch()` controls what the client sees, while [`router.on()`](/middleware/observability/overview) records what happened for logs and metrics. Wire both for full coverage:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Shape the client response
router.catch((ctx, info) => {
  return ctx.send.json(
    {
      error: 'Something went wrong'
    },
    {
      status: info.statusCode
    }
  )
})

// Record the failure for later
router.on((event) => {
  if (event.kind === 'request:error') {
    const { url, error } = event.metadata as { url: string; error?: Error }
    console.error(url, error?.message)
  }
})
```
