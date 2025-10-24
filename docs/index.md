# What is Deserve?

Deserve is an HTTP server library for Deno that makes building APIs incredibly simple through **file-based routing**. Just drop files in folders and get instant endpoints!

## Install Package

```bash
deno add jsr:@neabyte/deserve
```

## Start Building Your API

Create `main.ts` and add the following code:

```typescript
import { Router } from '@neabyte/deserve'

// Create a new router
const router = new Router()

// Serve the router on port 8000
router.serve(8000)
```

### Create a Route Handler

Create `routes/index.ts` and add the following code:

```typescript
import { Send } from '@neabyte/deserve'

// GET / -> Returns a JSON response with the message 'Hello World'
export function GET(req: Request): Response {
  return Send.json({ message: 'Hello World' })
}
```

### Run the Server

```bash
deno run --allow-net main.ts
```
