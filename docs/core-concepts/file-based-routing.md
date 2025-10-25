# File-based Routing

> **Reference**: [Deno File-based Routing Tutorial](https://docs.deno.com/examples/file_based_routing_tutorial/)

File-based routing is Deserve's core concept - your file system structure becomes your API structure automatically, following the same pattern as [Next.js](https://nextjs.org/) but for Deno APIs.

## How It Works

Deserve scans your routes directory and creates endpoints from file structure:

```
routes/
├── index.ts               → GET /
├── about.ts               → GET /about
├── users.ts               → GET /users
├── users/[id].ts          → GET /users/:id
└── users/[id]/
    └── posts/
        └── [postId].ts    → GET /users/:id/posts/:postId
```

## Core Rules

### 1. File Names Become Routes
- `index.ts` → `/` (root)
- `about.ts` → `/about`
- `users.ts` → `/users`

### 2. Folders Create Nested Routes
- `users/[id].ts` → `/users/:id`
- `users/[id]/posts.ts` → `/users/:id/posts`

### 3. Dynamic Parameters Use `[param]` Syntax
- `[id].ts` → `:id` parameter
- `[userId].ts` → `:userId` parameter
- `[postId].ts` → `:postId` parameter

### 4. HTTP Methods Are Exported Functions
```typescript
// routes/users.ts
export function GET(req: Request): Response {
  return Send.json({ users: [] })
}

export function POST(req: Request): Response {
  return Send.json({ message: 'User created' })
}
```

## Route Matching Priority

Deserve uses FastRouter with radix tree structure for efficient route matching with this priority:

1. **Static routes** - `users.ts` matches `/users` (O(1) lookup)
2. **Dynamic routes** - `users/[id].ts` matches `/users/123` (O(k) tree traversal)
3. **Longer paths** - More specific routes take precedence

## Examples

### Static Routes
```typescript
// routes/index.ts
export function GET(req: Request): Response {
  return Send.json({ message: 'Welcome' })
}

// routes/about.ts
export function GET(req: Request): Response {
  return Send.json({ message: 'About us' })
}
```

### Dynamic Routes
```typescript
// routes/users/[id].ts
import { Send, DeserveRequest } from '@neabyte/deserve'

export function GET(req: DeserveRequest, params: Record<string, string>) {
  const { id } = params
  return Send.json({ userId: id })
}

// routes/users/[id]/posts/[postId].ts
import { Send, DeserveRequest } from '@neabyte/deserve'

export function GET(req: DeserveRequest, params: Record<string, string>) {
  const { id, postId } = params
  return Send.json({ userId: id, postId })
}
```

## Best Practices

1. **Keep routes focused** - One resource per file
2. **Use descriptive names** - `users.ts` not `u.ts`
3. **Group related routes** - Use folders for organization
4. **Handle all methods** - Export all HTTP methods you need

## Next Steps

- [Route Patterns](/core-concepts/route-patterns) - Understanding pattern matching
- [HTTP Methods](/core-concepts/http-methods) - Supported methods
- [Request Handling](/core-concepts/request-handling) - Working with DeserveRequest
