---
description: "The Context object passed to every handler: request reading, response setting, response sending, and error handling."
---

# Context Object

The `Context` object wraps the native `Request` and gives every handler a single surface for reading the request, shaping the response, and forwarding errors. One `Context` flows from middleware to route handler, so data stays cached and consistent across the whole request.

## What Is Context

Context is a wrapper around Deno's native `Request` object, and every incoming request is wrapped in one Context that flows from middleware to route handler. Working through Context instead of the raw `Request` brings:

- **Lazy parsing** - data is parsed only when a method reads it
- **Three namespaces** - `ctx.get` reads, `ctx.set` shapes, `ctx.send` sends
- **Cached reads** - body, cookies, and params parse once and reuse the cache
- **Error routing** - `ctx.handleError()` forwards failures to one place

## Creating Context

Deserve creates Context automatically when a request arrives, so a handler only declares it as a parameter:

```typescript twoslash
import type { Context } from '@neabyte/deserve'

// Deserve builds ctx for each request
export function GET(ctx: Context): Response {
  return ctx.send.json({
    message: 'Hello'
  })
}
```

## Three Namespaces

Context splits its API into three frozen namespaces, each with one job:

| Namespace | Purpose | Example |
| --------- | ------- | ------- |
| `ctx.get` | Read request data | `ctx.get.header('host')` |
| `ctx.set` | Shape the response | `ctx.set.header('X-Custom', 'value')` |
| `ctx.send` | Build and send the response | `ctx.send.json({ ok: true })` |

The namespaces are frozen, so they cannot be reassigned or mutated at runtime. This keeps the request contract predictable across middleware and handlers.

## Reading Request Data

### `ctx.get.ip(options?)`

Reads the client IP address. Pass `{ direct: true }` to read the direct TCP peer instead of the resolved IP:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// Resolved IP, honors trustProxy
const client = ctx.get.ip()

// Direct TCP peer, ignores forwarded headers
const peer = ctx.get.ip({ direct: true })
```

Both return `undefined` when the peer is unknown. Without a matching [`trustProxy`](/getting-started/server-configuration#client-ip-resolution) rule, both return the same direct peer address.

### `ctx.get.method()`

Reads the request HTTP method:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
const method = ctx.get.method() // 'GET', 'POST', etc
```

### `ctx.get.url()`

Reads the parsed request URL instance:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
const url = ctx.get.url() // URL instance
const fullUrl = url.href    // 'http://localhost:8000/api/users?sort=name'
```

### `ctx.get.pathname()`

Reads the pathname portion of the URL:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
const path = ctx.get.pathname() // '/api/users/123'
```

### `ctx.get.request()`

Reads the underlying native `Request` instance:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
const req = ctx.get.request() // Request instance
```

### `ctx.get.header(key?)`

Reads one header by key or every header at once. Keys match case-insensitively:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// Read one header by name
const contentType = ctx.get.header('content-type')

// Read all headers as a record
const headers = ctx.get.header()
```

### `ctx.get.cookie(key?)`

Reads one cookie by key or every cookie at once. Cookies parse once and cache for later calls:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// Read one cookie by name
const sessionId = ctx.get.cookie('sessionId')

// Read all cookies as a record
const cookies = ctx.get.cookie() // { sessionId: 'abc123', theme: 'dark' }
```

### `ctx.get.query(key?)`

Reads one query parameter by key or every query parameter at once. The first value wins for duplicate keys:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// URL: /search?q=deno&limit=10
const q = ctx.get.query('q')     // 'deno'
const all = ctx.get.query()      // { q: 'deno', limit: '10' }

// URL: /search?tag=deno&tag=typescript
ctx.get.query('tag')             // 'deno', first value wins
ctx.get.query()                  // { tag: 'deno' }
```

### `ctx.get.param(key?)`

Reads one route parameter by key or every route parameter at once. Values are percent-decoded once before the handler reads them:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// Route: /users/[id]/posts/[postId]
// URL: /users/123/posts/456
const id = ctx.get.param('id')   // '123'
const all = ctx.get.param()      // { id: '123', postId: '456' }
```

### `ctx.get.body()`

Parses the request body automatically based on the `Content-Type` header. JSON, form-data, and text are all handled. Reading is async, so a handler that awaits it becomes `async`:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export async function POST(ctx: Context): Promise<Response> {
  // Body parses based on Content-Type
  const body = await ctx.get.body()
  return ctx.send.json({ received: body })
}
```

The body can only be read once. A second call with the same format returns the cached value, while a second call with a different format throws a **409 Conflict**.

### `ctx.get.json()`

Parses the request body as JSON, regardless of the `Content-Type` header:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export async function POST(ctx: Context): Promise<Response> {
  // Parse body as JSON
  const body = await ctx.get.json()
  return ctx.send.json({ received: body })
}
```

### `ctx.get.text()`

Reads the request body as raw text:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export async function POST(ctx: Context): Promise<Response> {
  // Read body as plain text
  const text = await ctx.get.text()
  return ctx.send.text(text)
}
```

### `ctx.get.formData()`

Parses the request body as form data and returns a `FormData` object:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export async function POST(ctx: Context): Promise<Response> {
  // Parse body as form data
  const formData = await ctx.get.formData()
  const name = formData.get('name')
  return ctx.send.json({ name })
}
```

### `ctx.get.blob()`

Reads the request body as a `Blob`, which suits file uploads and binary handling:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export async function POST(ctx: Context): Promise<Response> {
  // Read body as Blob
  const blob = await ctx.get.blob()
  return ctx.send.json({
    type: blob.type,
    size: blob.size
  })
}
```

### `ctx.get.bytes()`

Reads the request body as a `Uint8Array`, which suits binary data processing:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export async function POST(ctx: Context): Promise<Response> {
  // Read body as byte array
  const bytes = await ctx.get.bytes()
  return ctx.send.json({
    size: bytes.byteLength
  })
}
```

### `ctx.get.session()`

Reads the current session data. Requires the [session middleware](/middleware/session) to be registered, otherwise returns `null`:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// Read current session data
const session = ctx.get.session()
```

### `ctx.get.validated()`

Reads validated request data. Requires the [validate middleware](/middleware/validation/overview) to be registered. Throws when the middleware is missing:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// Read data that already passed validation
const validated = ctx.get.validated()
```

### `ctx.get.worker()`

Reads the worker pool controller for dispatching CPU-bound tasks. Requires a [worker pool](/recipes/worker-pool) to be configured. Throws when no pool is configured:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// Get worker pool controller
const worker = ctx.get.worker()
```

## Shaping the Response

### `ctx.set.header(key, value)`

Sets a single response header. Returns the `ctx.set` namespace for chaining:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Set one header, then chain another
  ctx.set
    .header('X-Custom', 'value')
    .header('Cache-Control', 'no-cache')
  return ctx.send.json({ data: 'test' })
}
```

### `ctx.set.headers(record)`

Sets multiple response headers at once. Returns the `ctx.set` namespace for chaining:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Set several headers at once
  ctx.set.headers({
    'X-Custom': 'value',
    'Cache-Control': 'no-cache',
    'X-Request-ID': 'abc123'
  })
  return ctx.send.json({ data: 'test' })
}
```

### `ctx.set.cookie(name, value, options?)`

Sets a response cookie with optional attributes. Returns the `ctx.set` namespace for chaining:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Set a cookie with attributes
  ctx.set.cookie('session', 'abc123', {
    httpOnly: true,
    maxAge: 3600,
    path: '/',
    sameSite: 'Lax',
    secure: true
  })
  return ctx.send.json({ ok: true })
}
```

The `options` object accepts `domain`, `expires`, `httpOnly`, `maxAge`, `path`, `sameSite`, and `secure`.

### `ctx.set.session(data)`

Writes session data through the session controller. Requires the [session middleware](/middleware/session) to be registered. Throws when the middleware is missing:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// Write session data
await ctx.set.session({ userId: '123' })

// Clear session data
await ctx.set.session(null)
```

## Sending the Response

### `ctx.send.json(data, options?)`

Sends a JSON response:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  return ctx.send.json(
    { message: 'Hello' },
    { status: 200 }
  )
}
```

### `ctx.send.text(text, options?)`

Sends a plain text response:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  return ctx.send.text('Hello World')
}
```

### `ctx.send.html(html, options?)`

Sends an HTML response:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  return ctx.send.html('<h1>Hello World</h1>')
}
```

### `ctx.send.custom(body, options?)`

Sends a custom response body. Use this for streams, blobs, or any `BodyInit`:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Send a readable stream as response
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('Hello'))
      controller.close()
    }
  })
  return ctx.send.custom(stream)
}
```

### `ctx.send.download(body, filename, options?)`

Sends a file download response with a `Content-Disposition` header:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Trigger a file download
  return ctx.send.download(
    'Hello World',
    'hello.txt'
  )
}
```

### `ctx.send.empty(status?)`

Sends an empty response body with an optional status code:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // 204 No Content
  return ctx.send.empty(204)
}
```

### `ctx.send.redirect(url, status?, options?)`

Sends a redirect response. The status defaults to `302`. The target URL is resolved against the request URL and blocked from crossing origins unless passed as a full `https://` or `http://` URL:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Redirect to a new location
  return ctx.send.redirect('/new-location', 301)
}
```

Allowed redirect statuses are `301`, `302`, `303`, `307`, and `308`. Any other status throws.

## Rendering Templates

When the router has a `views.directory` configured, Context can render DVE templates directly:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export async function GET(ctx: Context): Promise<Response> {
  // Render a template to an HTML response
  return await ctx.render(
    'home.dve',
    { title: 'Welcome' }
  )
}
```

Pass `{ stream: true }` as the third argument to stream the output for large pages:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// Stream a large template render
await ctx.render('dashboard.dve', { users: [] }, { stream: true })
```

Both throw when no `views.directory` is configured. See [Template Syntax](/rendering/syntax) for the template grammar and [Streaming Rendering](/rendering/streaming) for the streaming path.

## Error Handling

`ctx.handleError()` builds an error response and forwards it through the global error handler set with `router.catch()`. It is async, so a handler that calls it becomes `async` and awaits the result:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const isAuthorized: boolean
// ---cut---
export async function GET(ctx: Context): Promise<Response> {
  try {
    if (!isAuthorized) {
      // Forward to the error handler
      return await ctx.handleError(401, new Error('Unauthorized'))
    }
    return ctx.send.json({ data: 'success' })
  } catch (error) {
    // Catch unexpected failures
    return await ctx.handleError(500, error as Error)
  }
}
```

### How It Works

`ctx.handleError()` respects the global error handler set with [`router.catch()`](/error-handling/object-details):

- **When `router.catch()` is defined** - the custom error handler runs and can shape the response
- **When no error handler exists** - a default response carries the status code, negotiated as JSON or HTML based on the `Accept` header

### Use in Middleware

Middleware can call `ctx.handleError()` to trigger error handling the same way a handler does:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
declare const isValid: boolean
// ---cut---
router.use(async (ctx, next) => {
  if (!isValid) {
    // Routes through router.catch() when defined
    return await ctx.handleError(401, new Error('Unauthorized'))
  }
  return await next()
})
```

See [Error Handling](/error-handling/object-details) for the full centralized pattern, and [Defense in Depth](/error-handling/defense-in-depth) for how errors are caught in layers.

## Context Lifecycle

1. **Request arrives** - Deserve creates Context with the `Request`, parsed `URL`, client IP, and optional renderer
2. **Route matching** - route parameters are extracted and installed on Context
3. **Middleware execution** - Context passes through the middleware chain
4. **Route handler** - the handler receives Context and reads or sends through the three namespaces
5. **Response sent** - `ctx.send.*` or `ctx.handleError()` builds the final `Response`
