# Quick Start

Get up and running with Deserve in under 5 minutes!

## Project Structure

By the end of this guide, you'll have this project structure:

```
.
├── main.ts
└── routes/
    └── index.ts
```

## 1. Create Your Server

Create `main.ts`:

```typescript
import { Router } from '@neabyte/deserve'

const router = new Router()

await router.serve(8000)
```

## 2. Create Your First Route

Create a `routes` folder and add `index.ts`:

```typescript
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  return ctx.send.json({
    message: 'Hello from Deserve!',
    timestamp: new Date().toISOString()
  })
}
```

## 3. Run Your Server

```bash
deno run --allow-net --allow-read main.ts
```

## 4. Test Your API

```bash
curl http://localhost:8000
```

You should see:
```json
{
  "message": "Hello from Deserve!",
  "timestamp": "2077-01-01T00:00:00.000Z"
}
```
