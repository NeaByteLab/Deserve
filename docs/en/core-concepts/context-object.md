# Context Object

The `Context` object wraps the native `Request` and provides convenient methods for accessing request data, setting response headers, and sending responses.

## What is Context?

Context is a wrapper around Deno's native `Request` object. Instead of working with raw `Request` directly, you use `Context` which gives you:

- **Lazy parsing** - Data is parsed only when you access it
- **Convenient methods** - Simple APIs for common operations
- **Response utilities** - Built-in methods for sending responses
- **Header management** - Easy response header manipulation

## Why Using Context?

Context avoids multiple parsing and repeated processing during the request lifecycle. The handler receives one Context object that persists through the entire lifecycle — from middleware to route handler.

## Creating Context

Deserve creates Context automatically when requests arrive:

```typescript
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  return ctx.send.json({ message: 'Hello' })
}
```

## Context Structure

Context wraps several key pieces:

1. **Original Request** - Access via `ctx.request`
2. **Parsed URL** - Used internally for query params
3. **Route Parameters** - Extracted from dynamic routes
4. **Response Headers** - Set before sending response

## Lazy Parsing

Context uses lazy parsing for performance:

```typescript
export function GET(ctx: Context): Response {
  // Query params aren't parsed yet

  const query = ctx.query() // Parsed on first access
  // Now cached, subsequent calls return cached value

  const body = await ctx.body() // Parsed on first access
  // Parsed based on Content-Type

  return ctx.send.json({ query, body })
}
```

## Request Data Access

Access request data through Context methods:

- **Query Parameters** - `ctx.query()`, `ctx.queries()`
- **Route Parameters** - `ctx.param()`, `ctx.params()`
- **Headers** - `ctx.header()`, `ctx.headers`
- **Cookies** - `ctx.cookie()`
- **Body** - `ctx.body()`, `ctx.json()`, `ctx.formData()`, `ctx.text()`, `ctx.arrayBuffer()`, `ctx.blob()`
- **URL Information** - `ctx.url`, `ctx.pathname`

## Response Utilities

Send responses using `ctx.send`:

- `ctx.send.json()` - JSON responses
- `ctx.send.text()` - Plain text
- `ctx.send.html()` - HTML content
- `ctx.send.file()` - File downloads
- `ctx.send.data()` - In-memory data downloads
- `ctx.send.redirect()` - Redirects
- `ctx.send.custom()` - Custom responses
- `ctx.handleError()` - Error handling (unreleased)

You can also use `ctx.redirect()` directly as a convenience method:

```typescript
export function GET(ctx: Context): Response {
  return ctx.redirect('/new-location', 301)
  // Equivalent to: ctx.send.redirect('/new-location', 301)
}
```

## Response Headers

Set response headers before sending:

```typescript
export function GET(ctx: Context): Response {
  ctx.setHeader('X-Custom', 'value')
  ctx.setHeader('Cache-Control', 'no-cache')
  return ctx.send.json({ data: 'test' })
}
```

### Setting Multiple Headers

Use `setHeaders()` to set multiple headers at once:

```typescript
export function GET(ctx: Context): Response {
  ctx.setHeaders({
    'X-Custom': 'value',
    'Cache-Control': 'no-cache',
    'X-Request-ID': 'abc123'
  })
  return ctx.send.json({ data: 'test' })
}
```

### Reading Response Headers

Access all response headers that have been set:

```typescript
export function GET(ctx: Context): Response {
  ctx.setHeader('X-Custom', 'value')
  ctx.setHeader('Cache-Control', 'no-cache')
  const headers = ctx.responseHeadersMap // { 'X-Custom': 'value', 'Cache-Control': 'no-cache' }
  return ctx.send.json({ data: 'test' })
}
```

### URL and Pathname

Get URL information directly:

- `ctx.url` - Full URL string
- `ctx.pathname` - Pathname portion of URL (e.g., `/api/users/123`)

```typescript
export function GET(ctx: Context): Response {
  const fullUrl = ctx.url // 'http://localhost:8000/api/users/123?sort=name'
  const path = ctx.pathname // '/api/users/123'
  return ctx.send.json({ path, fullUrl })
}
```

## Error Handling

> [!WARNING]
> This feature is available in the development version but not yet released.

Handle errors consistently using `ctx.handleError()`:

```typescript
export function GET(ctx: Context): Response {
  try {
    if (!isAuthorized) {
      return ctx.handleError(401, new Error('Unauthorized'))
    }
    return ctx.send.json({ data: 'success' })
  } catch (error) {
    return ctx.handleError(500, error as Error)
  }
}
```

### How It Works

`ctx.handleError()` respects your global error handler set with `router.catch()`:

- **If `router.catch()` is defined** - Uses your custom error handler
- **If no error handler** - Returns a simple response with the status code

### Use in Middleware

Middleware can use `ctx.handleError()` to trigger error handling:

```typescript
router.use(async (ctx, next) => {
  if (!isValid) {
    return ctx.handleError(401, new Error('Unauthorized'))
    // This will use router.catch() if defined
  }
  return await next()
})
```

## Context Lifecycle

1. **Request arrives** - Deserve creates Context with Request and URL
2. **Route matching** - Route parameters extracted and added to Context
3. **Middleware execution** - Context passed through middleware chain
4. **Route handler** - Your handler receives Context
5. **Response sent** - Context methods used to build Response

