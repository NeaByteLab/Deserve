# Route Patterns

Deserve uses a **Simple Router** with radix tree structure algorithm.

## Pattern Matching

Deserve converts file paths to route patterns using a radix tree implementation:

```
.
├── routes/index.ts               → /
├── routes/about.ts               → /about
├── routes/users/[id].ts          → /users/:id
├── routes/users/[id]/posts.ts    → /users/:id/posts
```

## Dynamic Parameters

Use `[param]` syntax for dynamic route segments:

### Single Parameter
```typescript
// routes/users/[id].ts
import { Send, DeserveRequest } from '@neabyte/deserve'

export function GET(req: DeserveRequest, params: Record<string, string>) {
  const { id } = params
  return Send.json({ userId: id })
}
```

### Multiple Parameters
```typescript
// routes/users/[id]/posts/[postId].ts
import { Send, DeserveRequest } from '@neabyte/deserve'

export function GET(req: DeserveRequest, params: Record<string, string>) {
  const { id, postId } = params
  return Send.json({ userId: id, postId })
}
```

### Nested Parameters
```typescript
// routes/api/v1/users/[userId]/posts/[postId]/comments/[commentId].ts
import { Send, DeserveRequest } from '@neabyte/deserve'

export function GET(req: DeserveRequest, params: Record<string, string>) {
  const { userId, postId, commentId } = params
  return Send.json({ userId, postId, commentId })
}
```

## Pattern Examples

### User Management
```
routes/
├── users.ts                         → /users
├── users/[id].ts                    → /users/:id
├── users/[id]/profile.ts            → /users/:id/profile
├── users/[id]/posts.ts              → /users/:id/posts
└── users/[id]/posts/[postId].ts     → /users/:id/posts/:postId
```

### API Versioning
```
routes/
├── api/
│   ├── v1/
│   │   └── users/[id].ts            → /api/v1/users/:id
│   └── v2/
│       └── users/[id].ts            → /api/v2/users/:id
```

### Blog System
```
routes/
├── blog/
│   ├── [slug].ts                    → /blog/:slug
│   └── [year]/
│       └── [month]/
│           └── [day]/
│               └── [slug].ts        → /blog/:year/:month/:day/:slug
```

## Route Matching Priority

Deserve matches routes in this order:

1. **Exact matches** - Direct file path matches
2. **Dynamic routes** - Pattern-based matches
3. **Longer paths** - More specific routes take precedence

### Example Priority
```typescript
// These routes in order of precedence:
routes/users.ts                       // 1. Exact match
routes/users/[id].ts                  // 2. Dynamic match
routes/users/[id]/posts.ts            // 3. Longer path
routes/users/[id]/posts/[postId].ts   // 4. Longest path
```

## Parameter Validation

Extract and validate parameters in your route handlers:

```typescript
// routes/users/[id].ts
import { Send, DeserveRequest } from '@neabyte/deserve'

export function GET(req: DeserveRequest, params: Record<string, string>) {
  const { id } = params
  // Validate parameter
  if (!id || !/^\d+$/.test(id)) {
    return Send.json({ error: 'Invalid user ID' }, { status: 400 })
  }
  return Send.json({ userId: parseInt(id) })
}
```

## Complex Patterns

### Optional Parameters
```typescript
// routes/posts/[slug].ts
import { Send, DeserveRequest } from '@neabyte/deserve'

export function GET(req: DeserveRequest, params: Record<string, string>) {
  const { slug } = params
  // Handle post by slug
  return Send.json({ slug })
}
```

### Multiple Segments
```typescript
// routes/categories/[category]/products/[product].ts
import { Send, DeserveRequest } from '@neabyte/deserve'

export function GET(req: DeserveRequest, params: Record<string, string>) {
  const { category, product } = params
  return Send.json({ category, product })
}
```

## Performance Benefits

### Static Route Optimization
Static routes (no parameters) are cached for O(1) lookup:
```typescript
// These routes are optimized for instant matching
routes/index.ts                  → / (cached)
routes/about.ts                  → /about (cached)
routes/users.ts                  → /users (cached)
```

### Dynamic Route Matching
Dynamic routes use radix tree traversal for efficient matching:
```typescript
// These routes use tree traversal
routes/users/[id].ts             → /users/:id
routes/users/[id]/posts.ts       → /users/:id/posts
routes/api/v1/[version].ts       → /api/v1/:version
```

## Pattern Limitations

### Invalid Patterns
```
❌ routes/users/[...id].ts       // Rest parameters not supported
❌ routes/users/(group).ts       // Groups not supported
❌ routes/users/:id.ts           // Colon syntax not supported
❌ routes/users/*.ts             // Wildcard without brackets
❌ routes/users/**.ts            // Double wildcard without brackets
```

### Supported Patterns
```
✅ routes/users/[id].ts          // Single parameter
✅ routes/users/[id]/posts.ts    // Nested parameters
✅ routes/api/v1/[version].ts    // API versioning
✅ routes/posts/[slug].ts        // Slug-based routing
```

### Valid Patterns
```
✅ routes/users/[id].ts          // Single parameter
✅ routes/users/[id]/posts.ts    // Nested parameters
✅ routes/api/v1/users.ts        // Static segments
```

## Best Practices

1. **Use descriptive parameter names** - `[userId]` not `[id]`
2. **Validate parameters** - Check format and type
3. **Handle missing parameters** - Provide clear error messages
4. **Keep patterns simple** - Avoid overly complex nesting
5. **Use static segments** - Prefer `/api/v1/users` over `/api/[version]/users`

## Error Handling

Handle pattern matching errors gracefully:

```typescript
// main.ts
router.onError((req, error) => {
  if (error.statusCode === 404) {
    return Send.json(
      { error: 'Route not found', path: error.path },
      { status: 404 }
    )
  }
  return null
})
```

## Next Steps

- [HTTP Methods](/core-concepts/http-methods) - Supported methods
- [File-based Routing](/core-concepts/file-based-routing) - Core routing concepts
- [Request Handling](/core-concepts/request-handling) - Working with DeserveRequest
