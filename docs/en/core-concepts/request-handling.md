# Request Handling

> **Reference**: [Deno Request API Documentation](https://docs.deno.com/deploy/classic/api/runtime-request/)

Deserve provides a `Context` object that wraps native `Request` with methods for accessing query parameters, route parameters, headers, cookies, and body data.

## Basic Usage

Import `Context` type and use it in your route handlers:

```typescript
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  const query = ctx.query()
  return ctx.send.json({ query })
}
```

## Query Parameters

Access URL query parameters with automatic parsing:

### Single Query Parameters
```typescript
// URL: /search?q=deno&limit=10
export function GET(ctx: Context): Response {
  const query = ctx.query() // { q: 'deno', limit: '10' }
  return ctx.send.json({
    search: query.q,
    limit: parseInt(query.limit || '10')
  })
}
```

**Important:** When duplicate keys exist in the URL, `query()` returns the **last value**:

```typescript
// URL: /search?tag=deno&tag=typescript
const query = ctx.query() // { tag: 'typescript' } ← returns last value
```

### Multiple Values for Same Key

Use `queries()` when you need **all values** for a specific key:

```typescript
// URL: /search?tags=deno&tags=typescript&tags=javascript
export function GET(ctx: Context): Response {
  const tags = ctx.queries('tags') // ['deno', 'typescript', 'javascript']
  return ctx.send.json({ tags })
}
```

**Use cases:**
- **`query()`** - Get single values or last value when duplicates exist
- **`queries()`** - Get all values for arrays/multi-select parameters

### Complete Query Object
```typescript
// URL: /api/users?page=1&limit=20&sort=name&order=asc
export function GET(ctx: Context): Response {
  const query = ctx.query() // { page: '1', limit: '20', sort: 'name', order: 'asc' }
  return ctx.send.json({
    page: parseInt(query.page || '1'),
    limit: parseInt(query.limit || '10'),
    sort: query.sort || 'id',
    order: query.order || 'asc'
  })
}
```

## Route Parameters

Access dynamic route parameters from file-based routing:

### Single Parameter
```typescript
// routes/users/[id].ts
// URL: /users/123
export function GET(ctx: Context): Response {
  const id = ctx.param('id') // '123'
  return ctx.send.json({ userId: id })
}
```

### Multiple Parameters
```typescript
// routes/users/[id]/posts/[postId].ts
// URL: /users/123/posts/456
export function GET(ctx: Context): Response {
  const id = ctx.param('id')
  const postId = ctx.param('postId') // id='123', postId='456'
  return ctx.send.json({ userId: id, postId })
}
```

### All Parameters
```typescript
// routes/api/v1/users/[userId]/posts/[postId]/comments/[commentId].ts
// URL: /api/v1/users/123/posts/456/comments/789
export function GET(ctx: Context): Response {
  const params = ctx.params() // { userId: '123', postId: '456', commentId: '789' }
  return ctx.send.json(params)
}
```

## Method Reference

#### `ctx.query(key?)`
Returns all query parameters as an object. **Returns the last value for duplicate keys.**

```typescript
// URL: /search?q=deno&limit=10
const query = ctx.query() // { q: 'deno', limit: '10' }

// URL: /search?tag=deno&tag=typescript
const query = ctx.query() // { tag: 'typescript' } ← last value only

// Single parameter
const q = ctx.query('q') // Returns: 'deno'
```

#### `ctx.queries(key)`
Returns **all values** for a specific query parameter key as an array.

```typescript
// URL: /search?tags=deno&tags=typescript
const tags = ctx.queries('tags') // ['deno', 'typescript'] ← all values

// When to use:
// - query() for single values or when you only need the last value
// - queries() when you need all values for arrays/multi-select
```

#### `ctx.param(key)`
Returns a single route parameter value.

```typescript
// Route: /users/[id]
// URL: /users/123
const id = ctx.param('id') // '123'
```

#### `ctx.params()`
Returns all route parameters as an object.

```typescript
// Route: /users/[id]/posts/[postId]
// URL: /users/123/posts/456
const params = ctx.params() // { id: '123', postId: '456' }
```

#### `ctx.body()`
Parse request body automatically (JSON, form-data, or text).

```typescript
// POST /api/users with JSON body
export async function POST(ctx: Context): Promise<Response> {
  const body = await ctx.body() // { name: 'John', age: 30 }
  return ctx.send.json({ created: body })
}
```

#### `ctx.json()`
Parse request body as JSON.

```typescript
// POST /api/users with JSON body
export async function POST(ctx: Context): Promise<Response> {
  const body = await ctx.json() // { name: 'John', age: 30 }
  return ctx.send.json({ created: body })
}
```

#### `ctx.formData()`
Parse request body as form data. Returns a `FormData` object.

```typescript
// POST /api/users with form data
export async function POST(ctx: Context): Promise<Response> {
  const formData = await ctx.formData() // FormData object
  const name = formData.get('name') // 'John'
  return ctx.send.json({ name })
}
```

#### `ctx.text()`
Get request body as raw text.

```typescript
// POST /api/text with plain text
export async function POST(ctx: Context): Promise<Response> {
  const text = await ctx.text() // 'Hello World'
  return ctx.send.text(text)
}
```

#### `ctx.arrayBuffer()`
Read request body as ArrayBuffer. Useful for binary data processing.

```typescript
// POST /api/upload with binary data
export async function POST(ctx: Context): Promise<Response> {
  const buffer = await ctx.arrayBuffer() // ArrayBuffer object
  // Process binary data...
  return ctx.send.json({ size: buffer.byteLength })
}
```

#### `ctx.blob()`
Read request body as Blob. Useful for file uploads and binary data handling.

```typescript
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

#### `ctx.header(key?)`
Get header value by key or all headers (case-insensitive).

```typescript
// Get specific header
const contentType = ctx.header('content-type')

// Get all headers as object
const headers = ctx.header()

// Note: All headers are lowercased
```

#### `ctx.headers`
Get raw Headers object for direct access.

```typescript
// Access raw Headers API
const contentType = ctx.headers.get('Content-Type')
```

#### `ctx.cookie(key?)`
Get cookie value by key or all cookies.

```typescript
// Get specific cookie
const sessionId = ctx.cookie('sessionId')

// Get all cookies
const cookies = ctx.cookie() // { sessionId: 'abc123', theme: 'dark' }
```
