# Quick Start

Get up and running with Deserve in under 5 minutes!

## Project Structure

By the end of this guide, you'll have this project structure:

```
project/
├── main.ts
└── routes/
    ├── index.ts
    ├── users.ts
    └── users/
        └── [id].ts
```

## 1. Create Your Server

Create `main.ts`:

```typescript
import { Router } from '@neabyte/deserve'

// Create a new router
const router = new Router()

// Serve the router on port 8000
router.serve(8000)
```

## 2. Create Your First Route

Create a `routes` folder and add `index.ts`:

```typescript
// routes/index.ts
import { Send } from '@neabyte/deserve'

// GET / -> Returns a JSON response with the message
export function GET(req: Request): Response {
  return Send.json({
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
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 5. Add More Routes

Create `routes/users.ts`:

```typescript
// routes/users.ts
import { Send } from '@neabyte/deserve'

// GET /users -> Returns a JSON response with the list of users
export function GET(req: Request): Response {
  return Send.json({ users: ['alice', 'bob', 'charlie'] })
}

// POST /users -> Returns a JSON response with the message 'User created!'
export function POST(req: Request): Response {
  return Send.json({ message: 'User created!' })
}
```

Now you have:
- `GET /users` - List users
- `POST /users` - Create user

## 6. Dynamic Routes

Create `routes/users/[id].ts`:

```typescript
// routes/users/[id].ts
import { Send, DeserveRequest } from '@neabyte/deserve'

// GET /users/:id -> Returns a JSON response with the user id and name
export function GET(req: DeserveRequest, params: Record<string, string>) {
  const { id } = params
  return Send.json({ userId: id, name: `User ${id}` })
}
```

Test it:
```bash
curl http://localhost:8000/users/123
```

## Request Types

Deserve provides two request types:

- **`Request`**: Use for static routes without parameters
- **`DeserveRequest`**: Use for dynamic routes with parameters (like `[id].ts`)

### Static Routes (use `Request`)
```typescript
// routes/index.ts
export function GET(req: Request): Response {
  return Send.json({ message: 'Hello!' })
}
```

### Dynamic Routes (use `DeserveRequest`)
```typescript
// routes/users/[id].ts
import { DeserveRequest } from '@neabyte/deserve'

// GET /users/:id -> Returns a JSON response with the user id and query parameters
export function GET(req: DeserveRequest, params: Record<string, string>) {
  const userId = req.param('id')  // Access route parameter
  const query = req.query()       // Access query parameters
  return Send.json({ userId, query })
}
```

## What's Next?

You now have a working API! Explore more features:

- [Custom Configuration](/getting-started/custom-configuration) - Configure router options
- [File-based Routing](/core-concepts/file-based-routing) - Deep dive into routing patterns
- [Middleware](/middleware/global) - Add authentication and logging
