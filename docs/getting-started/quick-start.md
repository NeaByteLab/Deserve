---
description: "Build your first Deserve HTTP server and route in under five minutes."
---

# Quick Start

Get a Deserve server running in under 5 minutes.

## Project Structure

This guide ends with the following project structure:

```
.
├── main.ts
└── routes/
    └── index.ts
```

## 1. Create the Server

Create `main.ts`:

```typescript twoslash
import { Router } from '@neabyte/deserve'

// Router defaults routesDir to ./routes
const router = new Router()

// Listen on port 8000
await router.serve(8000)
```

## 2. Create the First Route

Create a `routes` folder and add `index.ts`:

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
