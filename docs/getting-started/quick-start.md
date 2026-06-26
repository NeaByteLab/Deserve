---
description: "Build a first Deserve HTTP server and route in under five minutes."
---

# Quick Start

Get a Deserve server running in under 5 minutes. Every snippet here is copy-paste ready, so open `main.ts` in an editor and follow along.

## Project Structure

This guide ends with the following project structure:

```
.
├── main.ts
└── routes/
    └── index.ts
```

## 1. Create the Server

Create `main.ts`. The `Router` scans `./routes` by default, so no configuration is needed for a basic setup:

```typescript twoslash
import { Router } from '@neabyte/deserve'

// Router scans ./routes by default
const router = new Router()

// Listen on port 8000
await router.serve(8000)
```

## 2. Create the First Route

Create a `routes` folder and add `index.ts`. The exported function name is the HTTP method, and `Context` carries the request and response helpers:

```typescript twoslash
import type { Context } from '@neabyte/deserve'

// GET handler maps to this route
export function GET(ctx: Context): Response {
  // Reply with a JSON body
  return ctx.send.json({
    message: 'Hello from Deserve!',
    timestamp: new Date().toISOString()
  })
}
```

## 3. Run the Server

Deno needs network and read permissions for the server and route files:

```bash
deno run --allow-net --allow-read main.ts
```

## 4. Test the API

```bash
curl http://localhost:8000
```

The response looks like this:

```json
{
  "message": "Hello from Deserve!",
  "timestamp": "2077-01-01T00:00:00.000Z"
}
```

## Where to Go Next

- [Installation](/getting-started/installation) - add Deserve to an existing project
- [Server Configuration](/getting-started/server-configuration) - hostname binding, shutdown, and process protection
- [Routes Configuration](/getting-started/routes-configuration) - route loading, limits, and advanced hooks
- [Context Object](/core-concepts/context-object) - the full request and response API
- [File-based Routing](/core-concepts/file-based-routing) - how folders map to URLs
