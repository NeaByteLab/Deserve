---
description: "How Deserve maps the routes directory structure to HTTP endpoints using file-based routing."
---

# File-based Routing

> **Reference**: [Deno File-based Routing Tutorial](https://docs.deno.com/examples/file_based_routing_tutorial/)

File-based routing is Deserve's core concept, where the file system structure becomes the API structure automatically, following the same pattern as [Next.js](https://nextjs.org/) but for Deno APIs.

## How It Works

Deserve scans the routes directory and creates endpoints from the file structure, and every supported extension (`.ts`, `.js`, `.tsx`, `.jsx`, `.mjs`, `.cjs`) works the same way:

```
routes/
├── index.ts               → GET /
├── about.mjs              → GET /about
├── users.js               → GET /users
├── users/[id].ts          → GET /users/:id
└── users/[id]/
    └── posts/
        └── [postId].jsx   → GET /users/:id/posts/:postId
```

## Core Rules

### 1. File Names Become Routes

- `index.ts`, `index.js`, `index.mjs` → `/` (root)
- `about.ts`, `about.js`, `about.mjs` → `/about`
- `users.ts`, `users.js`, `users.cjs` → `/users`

All supported extensions (`.ts`, `.js`, `.tsx`, `.jsx`, `.mjs`, `.cjs`) work identically.

### 2. Folders Create Nested Routes

- `users/[id].ts` → `/users/:id`
- `users/[id]/posts.ts` → `/users/:id/posts`

### 3. Dynamic Parameters Use `[param]` Syntax

- `[id].ts` → `:id` parameter
- `[userId].ts` → `:userId` parameter
- `[postId].ts` → `:postId` parameter

Dynamic segments are matched by [Route Patterns](/core-concepts/route-patterns) and read with `ctx.param()` from [Request Handling](/core-concepts/request-handling#route-parameters).

### 4. HTTP Methods Are Exported Functions

```typescript twoslash
import type { Context } from '@neabyte/deserve'

// Each export maps to its method
export function GET(ctx: Context): Response {
  return ctx.send.json({ users: [] })
}

export async function POST(ctx: Context): Promise<Response> {
  const data = await ctx.body()
  return ctx.send.json({
    message: 'User created',
    data
  })
}

// PUT, PATCH, DELETE follow the same shape
// export function [method](ctx: Context): Response { ... }
```

### 5. Case-Sensitive URLs

URLs are case-sensitive following HTTP standards:

- `/Users/John` ≠ `/users/john`
- `/API/v1` ≠ `/api/v1`

### 6. Valid Filename Characters

Files can contain specific rules:

- `a-z`, `A-Z`, `0-9` - Alphanumeric characters
- `_` - Underscore (do not prefix path segment - see below)
- `-` - Dash
- `.` - Dot
- `~` - Tilde
- `+` - Plus sign
- `[` `]` - Brackets for dynamic parameters

**Skipped segments:** Folders or file names that **start with** `_` or `@` are not registered as routes (e.g. `_layout.ts`, `@middleware.ts`, folder `_components/`). Useful for support files that are not endpoints.

Edited route files reload on the fly without a restart, covered in [Hot Reload](/core-concepts/hot-reload).
