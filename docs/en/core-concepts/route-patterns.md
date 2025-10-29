# Route Patterns

> **Reference**: [Fast Router GitHub Repository](https://github.com/NeaByteLab/Fast-Router)

Deserve uses **Fast Router** - a high-performance radix tree-based router for fast route matching and parameter extraction.

## Pattern Matching

Deserve converts file paths to route patterns. **FastRouter** handles pattern matching with radix tree for optimal performance:

```
.
├── routes/index.ts              → /
├── routes/about.ts              → /about
├── routes/users/[id].ts         → /users/:id
├── routes/users/[id]/posts.ts   → /users/:id/posts
```

## Dynamic Parameters

Use `[param]` syntax for dynamic route segments:

### Single Parameter
```typescript
// File: routes/users/[id].ts
import type { Context } from '@neabyte/deserve'

// GET /users/:id
export function GET(ctx: Context): Response {
  const id = ctx.param('id')
  return ctx.send.json({ userId: id })
}
```

### Multiple Parameters
```typescript
// File: routes/users/[id]/posts/[postId].ts
import type { Context } from '@neabyte/deserve'

// GET /users/:id/posts/:postId
export function GET(ctx: Context): Response {
  const id = ctx.param('id')
  const postId = ctx.param('postId')
  return ctx.send.json({ userId: id, postId })
}
```

### Nested Parameters
```typescript
// File: routes/api/v1/users/[userId]/posts/[postId]/comments/[commentId].ts
import type { Context } from '@neabyte/deserve'

// GET /api/v1/users/:userId/posts/:postId/comments/:commentId
export function GET(ctx: Context): Response {
  const userId = ctx.param('userId')
  const postId = ctx.param('postId')
  const commentId = ctx.param('commentId')
  return ctx.send.json({ userId, postId, commentId })
}
```

## Pattern Examples

### User Management
```
routes/
├── users.ts                       → /users
├── users/[id].ts                  → /users/:id
├── users/[id]/profile.ts          → /users/:id/profile
├── users/[id]/posts.ts            → /users/:id/posts
└── users/[id]/posts/[postId].ts   → /users/:id/posts/:postId
```

### API Versioning
```
routes/
├── api/
│   ├── v1/
│   │   └── users/[id].ts          → /api/v1/users/:id
│   └── v2/
│       └── users/[id].ts          → /api/v2/users/:id
```

### Blog System
```
routes/
├── blog/
│   ├── [slug].ts                  → /blog/:slug
│   └── [year]/
│       └── [month]/
│           └── [day]/
│               └── [slug].ts      → /blog/:year/:month/:day/:slug
```

## Parameter Validation

Extract and validate parameters in your route handlers:

```typescript
// File: routes/users/[id].ts
import type { Context } from '@neabyte/deserve'

// GET /users/:id
export function GET(ctx: Context): Response {
  const id = ctx.param('id')
  if (!id || !/^\d+$/.test(id)) {
    return ctx.send.json({ error: 'Invalid user ID' }, { status: 400 })
  }
  return ctx.send.json({ userId: parseInt(id) })
}
```
