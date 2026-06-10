---
description: "How Deserve parses and handles incoming requests, including body parsing and content negotiation."
---

# Request Handling

> **Reference**: [Deno Request API Documentation](https://docs.deno.com/deploy/classic/api/runtime-request/)

Deserve provides a `Context` object that wraps the native `Request`, so query, route params, headers, cookies, and body all come through Context without manual parsing. For the full Context surface, including response helpers and state, see [Context Object](/core-concepts/context-object).

A handler receives one `Context` and reads whatever it needs from it:

```typescript twoslash
import type { Context } from '@neabyte/deserve'

// Read request data from ctx
export function GET(ctx: Context): Response {
  const query = ctx.query()
  return ctx.send.json({ query })
}
```

The sections below cover each kind of input, and [Method Reference](#method-reference) lists every reader with its return type.

## Query Parameters

Query strings are parsed on first access, then cached. Two readers cover every case, `query()` for a single value and `queries()` for repeated keys:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
// URL: /search?q=deno&limit=10
export function GET(ctx: Context): Response {
  const query = ctx.query()
  return ctx.send.json({
    search: query.q,
    limit: parseInt(query.limit || '10')
  })
}
```

When a key repeats in the URL, `query()` keeps the **last value** while `queries()` returns **all of them**:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// URL: /search?tag=deno&tag=typescript
ctx.query('tag') // 'typescript', last value wins
ctx.queries('tag') // ['deno', 'typescript'], every value
```

Reach for `queries()` on array or multi-select inputs, and `query()` everywhere else. The full signatures live in [Method Reference](#method-reference).

## Route Parameters

Dynamic segments from [file-based routing](/core-concepts/file-based-routing) arrive as route params, read one at a time with `param()` or all at once with `params()`:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
// routes/users/[id]/posts/[postId].ts
// URL: /users/123/posts/456
export function GET(ctx: Context): Response {
  const id = ctx.param('id') // '123'
  const all = ctx.params() // { id: '123', postId: '456' }
  return ctx.send.json({
    id,
    all
  })
}
```

Values are percent-decoded once before the handler reads them. How patterns are matched is covered in [Route Patterns](/core-concepts/route-patterns).

## Method Reference

### `ctx.query(key?)`

Returns all query parameters as an object, and falls back to the **last value for duplicate keys**.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// URL: /search?q=deno&limit=10
ctx.query() // { q: 'deno', limit: '10' }

// URL: /search?tag=deno&tag=typescript
ctx.query() // { tag: 'typescript' } ← last value only

// Single parameter
const q = ctx.query('q') // Returns: 'deno'
```

### `ctx.queries(key)`

Returns **all values** for one query parameter key as an array.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// URL: /search?tags=deno&tags=typescript
const tags = ctx.queries('tags') // ['deno', 'typescript'] ← all values

// query() covers single or last value, while queries() covers arrays and multi-select
```

### `ctx.param(key)`

Returns a single route parameter value.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// Route: /users/[id]
// URL: /users/123
const id = ctx.param('id') // '123'
```

### `ctx.params()`

Returns all route parameters as an object.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// Route: /users/[id]/posts/[postId]
// URL: /users/123/posts/456
const params = ctx.params() // { id: '123', postId: '456' }
```

### `ctx.body()`

Parses the request body automatically as JSON, form-data, or text.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
// POST /api/users with JSON body
export async function POST(ctx: Context): Promise<Response> {
  const body = await ctx.body() // { name: 'John', age: 30 }
  return ctx.send.json({
    created: body
  })
}
```

### `ctx.json()`

Parses the request body as JSON.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
// POST /api/users with JSON body
export async function POST(ctx: Context): Promise<Response> {
  const body = await ctx.json() // { name: 'John', age: 30 }
  return ctx.send.json({
    created: body
  })
}
```

### `ctx.formData()`

Parses the request body as form data and returns a `FormData` object.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
// POST /api/users with form data
export async function POST(ctx: Context): Promise<Response> {
  const formData = await ctx.formData() // FormData object
  const name = formData.get('name') // 'John'
  return ctx.send.json({ name })
}
```

### `ctx.text()`

Reads the request body as raw text.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
// POST /api/text with plain text
export async function POST(ctx: Context): Promise<Response> {
  const text = await ctx.text() // 'Hello World'
  return ctx.send.text(text)
}
```

### `ctx.arrayBuffer()`

Reads the request body as an ArrayBuffer, which suits binary data processing.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
// POST /api/upload with binary data
export async function POST(ctx: Context): Promise<Response> {
  const buffer = await ctx.arrayBuffer() // ArrayBuffer object
  // Process binary data...
  return ctx.send.json({
    size: buffer.byteLength
  })
}
```

### `ctx.blob()`

Reads the request body as a Blob, which suits file uploads and binary handling.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
// POST /api/upload with file data
export async function POST(ctx: Context): Promise<Response> {
  const blob = await ctx.blob() // Blob object
  // Process file data...
  return ctx.send.json({
    type: blob.type,
    size: blob.size
  })
}
```

### `ctx.header(key?)`

Reads one header by key or every header at once, matching keys case-insensitively and lowercasing them.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// Get specific header
const contentType = ctx.header('content-type')

// Get all headers as object
const headers = ctx.header()
```

### `ctx.headers`

Exposes the raw Headers object for direct access.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// Access raw Headers API
const contentType = ctx.headers.get('Content-Type')
```

### `ctx.cookie(key?)`

Reads one cookie by key or every cookie at once.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// Get specific cookie
const sessionId = ctx.cookie('sessionId')

// Get all cookies
const cookies = ctx.cookie() // { sessionId: 'abc123', theme: 'dark' }
```
