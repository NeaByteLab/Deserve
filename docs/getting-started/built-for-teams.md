---
description: "Patterns for organizing larger Deserve apps with middleware scoping and shared configuration for teams."
---

# Built for Teams

Deserve keeps the structure of an app obvious, so a team reads the folder tree and already knows the API. There is no central route table to study and no framework-specific wiring to learn first. This follows the [philosophy](/core-concepts/philosophy#core-beliefs) that file structure is the API structure, which keeps a codebase easy for teams to maintain.

## The Folder Is the Map

A new contributor opens the `routes` folder and reads the endpoints straight from the paths:

```
routes/
├── index.ts            # GET  /
├── health.ts           # GET  /health
├── users/
│   ├── index.ts        # GET  /users
│   ├── [id].ts         # GET  /users/:id
│   └── [id]/
│       └── posts.ts    # GET  /users/:id/posts
└── orders/
    └── index.ts        # POST /orders
```

No registry to cross-check, no decorators to trace. The path on disk is the path on the wire, covered in [File-based Routing](/core-concepts/file-based-routing).

## A Junior Ships on Day One

Adding an endpoint means adding a file. A junior developer who needs a `GET /products` route creates `routes/products/index.ts` and exports a handler:

```typescript twoslash
// routes/products/index.ts
import type { Context } from '@neabyte/deserve'

// New endpoint, no registration needed
export function GET(ctx: Context): Response {
  return ctx.send.json({
    products: []
  })
}
```

The route is live on the next save through [Hot Reload](/core-concepts/hot-reload), with no restart and no edit to a shared config file that might cause a merge conflict.

## Predictable Handlers

Every route file follows the same shape, so reviewing a teammate's code needs no guesswork. The exported function name is the HTTP method, and the `Context` gives the request and the response helpers:

```typescript twoslash
// routes/orders/index.ts
import type { Context } from '@neabyte/deserve'

// Method name is the HTTP verb
export async function POST(ctx: Context): Promise<Response> {
  const order = await ctx.body()
  return ctx.send.json(
    {
      created: true,
      order
    },
    { status: 201 }
  )
}
```

A reviewer reads `POST` and knows the verb, reads `ctx.body()` and knows the input, reads `ctx.send.json()` and knows the output. The same pattern holds across every file, which is the [developer experience](/core-concepts/philosophy#core-beliefs) the framework aims for. Details live in [Request Handling](/core-concepts/request-handling) and the [Context Object](/core-concepts/context-object).

## Shared Rules in One Place

Cross-cutting concerns stay in one spot rather than scattered through handlers. One developer can own auth, another can own logging, and neither has to touch the other's route files:

```typescript twoslash
// main.ts
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()

// Security headers for every route
router.use(Mware.securityHeaders())

// Auth only for the admin area
router.use(
  '/admin',
  Mware.basicAuth({
    users: [
      {
        username: 'admin',
        password: Deno.env.get('ADMIN_PASSWORD') ?? 'change-me'
      }
    ]
  })
)

await router.serve(8000)
```

Handlers stay focused on their own job, while shared behavior is applied once. The full set of building blocks is in [Global Middleware](/middleware/global), and errors flow to one place through [error handling](/error-handling/object-details).

## Many Hands, One Process

Larger teams often split an app into services. Deserve runs several routers in a single process, so one person can work on the API while another works on auth without separate deployments or network glue between them:

```typescript twoslash
// main.ts
import { Router } from '@neabyte/deserve'

const api = new Router({ routesDir: './services/api/routes' })
const auth = new Router({ routesDir: './services/auth/routes' })

// Each service owns its folder and port
await Promise.all([
  api.serve(3001),
  auth.serve(3002)
])
```

Each service has its own folder, port, and file watcher, so teams move in parallel without stepping on each other. The full pattern, including shared code and a shared error handler, is in [Multi-Service](/core-concepts/multi-service).

## Where to Go Next

- [File-based Routing](/core-concepts/file-based-routing) - how folders map to URLs
- [Hot Reload](/core-concepts/hot-reload) - edits go live without a restart
- [Multi-Service](/core-concepts/multi-service) - many services in one process
- [Philosophy](/core-concepts/philosophy) - the thinking behind the design
