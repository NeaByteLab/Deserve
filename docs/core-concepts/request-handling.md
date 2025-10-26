# Request Handling

> **Reference**: [Deno Request API Documentation](https://docs.deno.com/deploy/classic/api/runtime-request/)

Deserve provides an enhanced `DeserveRequest` class that extends the native `Request` object with methods for accessing query and route parameters automatically.

## Basic Usage

Import `DeserveRequest` and use it in your route handlers:

```typescript
import { Send, DeserveRequest } from '@neabyte/deserve'

// routes/users.ts
export function GET(req: DeserveRequest): Response {
  const query = req.query()
  return Send.json({ query })
}
```

## Query Parameters

Access URL query parameters with automatic parsing:

### Single Query Parameters
```typescript
// URL: /search?q=deno&limit=10
export function GET(req: DeserveRequest): Response {
  const query = req.query() // Expected: { q: 'deno', limit: '10' }
  return Send.json({
    search: query.q,
    limit: parseInt(query.limit || '10')
  })
}
```

**Important:** When duplicate keys exist in the URL, `query()` returns the **last value**:
```typescript
// URL: /search?tag=deno&tag=typescript
const query = req.query() // { tag: 'typescript' } ← returns last value
```

### Multiple Values for Same Key

Use `queries()` when you need **all values** for a specific key:

```typescript
// URL: /search?tags=deno&tags=typescript&tags=javascript
export function GET(req: DeserveRequest): Response {
  const tags = req.queries('tags') // Expected: ['deno', 'typescript', 'javascript']
  return Send.json({ tags })
}
```

**Use cases:**
- **`query()`** - Get single values or last value when duplicates exist
- **`queries()`** - Get all values for arrays/multi-select parameters

### Complete Query Object
```typescript
// URL: /api/users?page=1&limit=20&sort=name&order=asc
export function GET(req: DeserveRequest): Response {
  const query = req.query() // Expected: { page: '1', limit: '20', sort: 'name', order: 'asc' }
  return Send.json({
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
export function GET(req: DeserveRequest): Response {
  const id = req.param('id') // Expected: '123'
  return Send.json({ userId: id })
}
```

### Multiple Parameters
```typescript
// routes/users/[id]/posts/[postId].ts
// URL: /users/123/posts/456
export function GET(req: DeserveRequest): Response {
  const id = req.param('id')
  const postId = req.param('postId') // Expected: id='123', postId='456'
  return Send.json({ userId: id, postId })
}
```

### All Parameters
```typescript
// routes/api/v1/users/[userId]/posts/[postId]/comments/[commentId].ts
// URL: /api/v1/users/123/posts/456/comments/789
export function GET(req: DeserveRequest): Response {
  const params = req.params() // Expected: { userId: '123', postId: '456', commentId: '789' }
  return Send.json(params)
}
```

## Method Reference

#### `req.query()`
Returns all query parameters as an object. **Returns the last value for duplicate keys.**

```typescript
// URL: /search?q=deno&limit=10
const query = req.query()
// Expected: { q: 'deno', limit: '10' }

// URL: /search?tag=deno&tag=typescript
const query = req.query()
// Expected: { tag: 'typescript' } ← last value only
```

#### `req.queries(key)`
Returns **all values** for a specific query parameter key as an array.

```typescript
// URL: /search?tags=deno&tags=typescript
const tags = req.queries('tags')
// Expected: ['deno', 'typescript'] ← all values

// When to use:
// - query() for single values or when you only need the last value
// - queries() when you need all values for arrays/multi-select
```

#### `req.param(key)`
Returns a single route parameter value.

```typescript
// Route: /users/[id]
// URL: /users/123
const id = req.param('id')
// Expected: '123'
```

#### `req.params()`
Returns all route parameters as an object.

```typescript
// Route: /users/[id]/posts/[postId]
// URL: /users/123/posts/456
const params = req.params()
// Expected: { id: '123', postId: '456' }
```

#### `req.json()`
Parse request body as JSON.

```typescript
// POST /api/users with JSON body
const body = await req.json()
// Expected: { name: 'John', age: 30 }
```

#### `req.formData()`
Parse request body as form data.

```typescript
// POST /api/users with form data
const formData = await req.formData()
const name = formData.get('name')
// Expected: name = 'John'
```

#### `req.text()`
Get request body as raw text.

```typescript
// POST /api/text with plain text
const text = await req.text()
// Expected: 'Hello World'
```

#### `req.blob()`
Get request body as binary data.

```typescript
// POST /api/upload with file
const blob = await req.blob()
// Expected: Blob object
```

#### `req.arrayBuffer()`
Get request body as ArrayBuffer.

```typescript
// POST /api/binary with binary data
const buffer = await req.arrayBuffer()
// Expected: ArrayBuffer object
```

## Best Practices

1. **Validate parameters** - Check format and type before using
2. **Provide defaults** - Use fallback values for optional parameters
3. **Handle missing values** - Check for undefined/null values
4. **Use appropriate types** - Convert strings to numbers when needed
5. **Keep parameter names descriptive** - Use clear, meaningful names

## Next Steps

- [File-based Routing](/core-concepts/file-based-routing) - Understanding route structure
- [Route Patterns](/core-concepts/route-patterns) - Dynamic parameter patterns
- [HTTP Methods](/core-concepts/http-methods) - Supported request methods
