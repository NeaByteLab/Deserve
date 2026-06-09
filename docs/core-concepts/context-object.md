---
description: "The Context object passed to every handler: request access, response helpers, params, state, and cookies."
---

# Context Object

The `Context` object wraps the native `Request` and provides convenient methods for accessing request data, setting response headers, and sending responses.

## What is Context?

Context is a wrapper around Deno's native `Request` object, and every incoming request is wrapped in one Context that flows from middleware to route handler. Working through Context instead of the raw `Request` brings:

- **Lazy parsing** - data is parsed only when a method reads it
- **Convenient methods** - simple APIs for common operations
- **Response utilities** - built-in methods for sending responses
- **Header management** - easy response header changes

## Why Context?

Context avoids repeated parsing and reprocessing during the request lifecycle, since the handler receives one Context object that persists the whole way from middleware to route handler.

## Creating Context

Deserve creates Context automatically when a request arrives:

```typescript twoslash
import type { Context } from '@neabyte/deserve'

// Deserve builds ctx for each request
export function GET(ctx: Context): Response {
  return ctx.send.json({ message: 'Hello' })
}
```

## Context Structure

Context wraps several key pieces:

1. **Original Request** - access via `ctx.request`
2. **Parsed URL** - used internally for query params
3. **Route Parameters** - extracted from dynamic routes
4. **Response Headers** - set before sending the response

## Lazy Parsing

Context parses lazily for performance, so query, body, cookie, and header data is read only when the matching method runs, and the result is cached for later calls. Reading the body is async, so a handler that awaits it becomes `async` and returns `Promise<Response>`:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export async function GET(ctx: Context): Promise<Response> {
  // Query parses on first read
  const query = ctx.query()
  // Repeat calls reuse the cache

  // Body parses based on Content-Type
  const body = await ctx.body()

  // Return query and body together
  return ctx.send.json({
    query,
    body
  })
}
```

## Request Data Access

Request data is reached through Context methods, where query, params, headers, and cookies are synchronous while body readers are async:

- **Query Parameters** - `ctx.query()`, `ctx.queries()`
- **Route Parameters** - `ctx.param()`, `ctx.params()`
- **Headers** - `ctx.header()`, `ctx.headers`
- **Cookies** - `ctx.cookie()`
- **Body (async)** - `await ctx.body()`, `await ctx.json()`, `await ctx.formData()`, `await ctx.text()`, `await ctx.arrayBuffer()`, `await ctx.blob()`
- **URL Information** - `ctx.url`, `ctx.pathname`
- **Client IP** - `ctx.ip`, `ctx.directIp`

## Response Utilities

Send responses using `ctx.send`, with one method per response type:

- [`ctx.send.json()`](/response/json) - JSON response
- [`ctx.send.text()`](/response/text) - plain text
- [`ctx.send.html()`](/response/html) - HTML content
- [`ctx.send.file()`](/response/file) - file download
- [`ctx.send.data()`](/response/data) - in-memory data download
- [`ctx.send.stream()`](/response/stream) - stream response (ReadableStream)
- [`ctx.send.redirect()`](/response/redirect) - redirect
- [`ctx.send.custom()`](/response/custom) - custom response
- `ctx.handleError()` - route a failure through [error handling](/error-handling/object-details)

The `ctx.redirect()` shorthand maps straight to `ctx.send.redirect()`:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Shorthand for ctx.send.redirect
  return ctx.redirect('/new-location', 301)
}
```

## Response Headers

Set response headers before sending:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  ctx.setHeader('X-Custom', 'value')
  ctx.setHeader('Cache-Control', 'no-cache')
  return ctx.send.json({ data: 'test' })
}
```

### Setting Multiple Headers

`setHeaders()` applies several headers at once:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  ctx.setHeaders({
    'X-Custom': 'value',
    'Cache-Control': 'no-cache',
    'X-Request-ID': 'abc123'
  })
  return ctx.send.json({ data: 'test' })
}
```

### URL and Pathname

URL details are read directly from Context:

- `ctx.url` - full URL string
- `ctx.pathname` - pathname portion of the URL, such as `/api/users/123`

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  const fullUrl = ctx.url // 'http://localhost:8000/api/users/123?sort=name'
  const path = ctx.pathname // '/api/users/123'
  return ctx.send.json({
    path,
    fullUrl
  })
}
```

### Client IP

The client IP is read from Context, and both values are `undefined` when the peer is unknown:

- `ctx.ip` - resolved client IP, honors [`trustProxy`](/getting-started/server-configuration#client-ip-resolution)
- `ctx.directIp` - direct TCP peer, ignores forwarded headers

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  const client = ctx.ip // real visitor IP
  const peer = ctx.directIp // direct connection IP
  return ctx.send.json({
    client,
    peer
  })
}
```

## Sharing State

Context carries request-scoped state so middleware and handlers can pass values along the chain. `ctx.state` is a plain object shared for the whole request:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
router.use(async (ctx, next) => {
  // Attach a value for later handlers
  ctx.state.requestId = crypto.randomUUID()
  return await next()
})

export function GET(ctx: Context): Response {
  // Read what middleware stored
  return ctx.send.json({ id: ctx.state.requestId })
}
```

For typed access, `setState` and `getState` use a key and a value type:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// Store a typed value
ctx.setState<string>('userId' as never, '123')

// Read it back with the same type
const userId = ctx.getState<string>('userId' as never)
```

The `as never` on the key is deliberate, not a workaround to copy blindly. State keys are a branded type, so the framework can reserve a few names for its own wiring and reject them at compile time. A plain string does not carry that brand, and `as never` is what tells the type system this string is a valid key. The value type stays real and checked, so `getState<string>(...)` still returns `string | undefined`.

Some keys are reserved for framework wiring and are read-only through `getState`. Calling `setState` on one throws a 500 error. The reserved keys are `view`, `worker`, `session`, `setSession`, and `clearSession`. The [worker pool](/core-concepts/worker-pool) and [session middleware](/middleware/session) read their handles this way.

## Rendering Templates

When the router has a `viewsDir`, Context can render DVE templates directly:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export async function GET(ctx: Context): Promise<Response> {
  // Render a template to an HTML response
  return await ctx.render('home.dve', { title: 'Welcome' })
}
```

`ctx.streamRender()` streams the same output for large pages. Both throw when no `viewsDir` is configured. See [Template Syntax](/rendering/syntax) for the template grammar and [Streaming Rendering](/rendering/streaming) for the streaming path.

## Error Handling

`ctx.handleError()` builds an error response and is async, so a handler that calls it becomes `async` and awaits the result:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const isAuthorized: boolean
// ---cut---
export async function GET(ctx: Context): Promise<Response> {
  try {
    if (!isAuthorized) {
      return await ctx.handleError(401, new Error('Unauthorized'))
    }
    return ctx.send.json({ data: 'success' })
  } catch (error) {
    return await ctx.handleError(500, error as Error)
  }
}
```

### How It Works

`ctx.handleError()` respects the global error handler set with `router.catch()`:

- **When `router.catch()` is defined** - the custom error handler runs
- **When no error handler exists** - a simple response carries the status code

### Use in Middleware

Middleware can call `ctx.handleError()` to trigger error handling:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
declare const isValid: boolean
// ---cut---
router.use(async (ctx, next) => {
  if (!isValid) {
    // This routes through router.catch() when defined
    return await ctx.handleError(401, new Error('Unauthorized'))
  }
  return await next()
})
```

## Context Lifecycle

1. **Request arrives** - Deserve creates Context with Request and URL
2. **Route matching** - route parameters are extracted and added to Context
3. **Middleware execution** - Context passes through the middleware chain
4. **Route handler** - the handler receives Context
5. **Response sent** - Context methods build the Response
