---
description: "Route pattern syntax in Deserve including dynamic params and matching rules."
---

# Route Patterns

> **Reference**: [Fast Router GitHub Repository](https://github.com/NeaByteLab/Fast-Router)

[File-based Routing](/core-concepts/file-based-routing) covers the rules that turn a folder into URLs. This page covers the other half, the matching engine that decides which file answers an incoming request. Deserve uses **Fast Router** (radix tree) to match a path and pull out parameters, where a `[param]` folder becomes a `:param` slot at the router level.

## Pattern Matching

Deserve converts file paths to route patterns, and **FastRouter** matches them with a radix tree for fast lookups:

```
.
├── routes/index.ts              → /
├── routes/about.ts              → /about
├── routes/users/[id].ts         → /users/:id
├── routes/users/[id]/posts.ts   → /users/:id/posts
```

## How Matching Works

When a request arrives, the engine looks up the method and pathname, then applies a few fixed rules:

- **Exact path, exact method** - the matching handler runs with its params filled in
- **HEAD falls back to GET** - a `HEAD` with no handler reuses the `GET` handler
- **Wrong method** - a known path with no handler for that method returns **405** with an `Allow` header listing the methods that do exist
- **Unknown path** - no match returns **404** through the [error handler](/error-handling/object-details)
- **Oversized input** - a URL past `maxUrlLength` or a param past `routes.maxParamLength` returns **414**, both tunable in [Routes Configuration](/getting-started/routes-configuration)

Params are percent-decoded once before the handler reads them, so `ctx.get.param('id')` returns the decoded value.

## Dynamic Parameters

A `[param]` folder or file becomes a named `:param` slot in the pattern. Each bracket in the path turns into one parameter, and nesting just adds more:

| File path                                          | Pattern                                    | Params                       |
| -------------------------------------------------- | ------------------------------------------ | ---------------------------- |
| `users/[id].ts`                                    | `/users/:id`                               | `id`                         |
| `users/[id]/posts/[postId].ts`                     | `/users/:id/posts/:postId`                 | `id`, `postId`               |
| `api/v1/users/[userId]/posts/[postId].ts`          | `/api/v1/users/:userId/posts/:postId`      | `userId`, `postId`           |

The matched values are read inside a handler with `ctx.get.param('id')` for one value or `ctx.get.param()` for the full map, covered in [Request Handling](/core-concepts/request-handling#route-parameters).

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

The router matches the shape of a pattern, not the meaning of a value, so `/users/:id` matches `abc` just as happily as `123`. A handler validates the value and returns a status code that flows to the [error handler](/error-handling/object-details):

```typescript twoslash
// File: routes/users/[id].ts
import type { Context } from '@neabyte/deserve'

// Reject non-numeric ids with 400
export function GET(ctx: Context): Response {
  const id = ctx.get.param('id')
  if (!id || !/^\d+$/.test(id)) {
    return ctx.send.json(
      { error: 'Invalid user ID' },
      { status: 400 }
    )
  }
  return ctx.send.json({
    userId: parseInt(id)
  })
}
```

A handler that validates several params, or wants the failure to carry field-level reasons, runs a [validation](/middleware/validation/overview) contract with `Validator.check` instead of an inline regex. Params are checked inside the handler because they resolve after middleware runs, covered in [Reading Validated Data](/middleware/validation/reading-data#checking-params-in-a-handler).
