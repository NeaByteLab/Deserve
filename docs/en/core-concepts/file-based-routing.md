# File-based Routing

> **Reference**: [Deno File-based Routing Tutorial](https://docs.deno.com/examples/file_based_routing_tutorial/)

File-based routing is Deserve's core concept - your file system structure becomes your API structure automatically, following the same pattern as [Next.js](https://nextjs.org/) but for Deno APIs.

## How It Works

Deserve scans your routes directory and creates endpoints from file structure. All supported extensions (`.ts`, `.js`, `.tsx`, `.jsx`, `.mjs`, `.cjs`) work the same way:

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

### 4. HTTP Methods Are Exported Functions

```typescript
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  return ctx.send.json({ users: [] })
}

export async function POST(ctx: Context): Promise<Response> {
  const data = await ctx.body()
  return ctx.send.json({ message: 'User created', data })
}

// export function [method](ctx: Context): Response {
// ... code here ...
// }
```

### 5. Case-Sensitive URLs

URLs are case-sensitive following HTTP standards:

- `/Users/John` ≠ `/users/john`
- `/API/v1` ≠ `/api/v1`

### 6. Valid Filename Characters

Files can contain specific rules:

- `a-z`, `A-Z`, `0-9` - Alphanumeric characters
- `_` - Underscore
- `-` - Dash
- `.` - Dot
- `~` - Tilde
- `+` - Plus sign
- `[` `]` - Brackets for dynamic parameters
