# HTTP Methods

Deserve supports all standard HTTP methods through exported functions.

## Supported Methods

Export any of these HTTP methods from your route files:

- `GET` - Retrieve data
- `POST` - Create new resources
- `PUT` - Update/replace resources
- `PATCH` - Partial updates
- `DELETE` - Remove resources
- `HEAD` - Get headers only
- `OPTIONS` - Get allowed methods

## Basic Usage

```typescript
// routes/users.ts
export function GET(req: Request): Response {
  return Send.json({ users: [] })
}

export function POST(req: Request): Response {
  return Send.json({ message: 'User created' })
}

export function PUT(req: Request): Response {
  return Send.json({ message: 'User updated' })
}

export function DELETE(req: Request): Response {
  return Send.json({ message: 'User deleted' })
}
```

## Method-Specific Examples

### GET - Retrieve Data
```typescript
// routes/users.ts
export function GET(req: Request): Response {
  const users = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' }
  ]
  return Send.json({ users })
}
```

### POST - Create Resources
```typescript
// routes/users.ts
export async function POST(req: Request): Response {
  const data = await req.json()
  // Process user creation...
  return Send.json({ message: 'User created', id: 123 }, { status: 201 })
}
```

### PUT - Update Resources
```typescript
// routes/users/[id].ts
import { Send, DeserveRequest } from '@neabyte/deserve'

export async function PUT(req: DeserveRequest, params: Record<string, string>) {
  const { id } = params
  const data = await req.json()
  // Update user with id...
  return Send.json({ message: 'User updated', id })
}
```

### PATCH - Partial Updates
```typescript
// routes/users/[id].ts
import { Send, DeserveRequest } from '@neabyte/deserve'

export async function PATCH(req: DeserveRequest, params: Record<string, string>) {
  const { id } = params
  const data = await req.json()
  // Partial update user with id...
  return Send.json({ message: 'User partially updated', id })
}
```

### DELETE - Remove Resources
```typescript
// routes/users/[id].ts
import { Send, DeserveRequest } from '@neabyte/deserve'

export function DELETE(req: DeserveRequest, params: Record<string, string>) {
  const { id } = params
  // Delete user with id...
  return Send.json({ message: 'User deleted', id })
}
```

### HEAD - Headers Only
```typescript
// routes/users.ts
export function HEAD(req: Request): Response {
  return new Response(null, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': '100'
    }
  })
}
```

### OPTIONS - Allowed Methods
```typescript
// routes/users.ts
export function OPTIONS(req: Request): Response {
  return new Response(null, {
    status: 200,
    headers: {
      'Allow': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    }
  })
}
```

## Method Not Allowed

If a route doesn't export a specific HTTP method, Deserve returns a `501 Method Not Allowed` response:

```typescript
// routes/users.ts - Only exports GET
export function GET(req: Request): Response {
  return Send.json({ users: [] })
}

// POST /users will return 501 Method Not Allowed
```

## Custom Error Handling

Handle method not allowed errors with custom error middleware:

```typescript
// main.ts
router.onError((req, error) => {
  if (error.statusCode === 501) {
    return Send.json(
      { error: 'Method not allowed', method: error.method },
      { status: 501 }
    )
  }
  return null
})
```

## Best Practices

1. **Export only needed methods** - Don't export methods you don't use
2. **Use appropriate status codes** - 201 for POST, 204 for DELETE
3. **Handle async operations** - Use `async/await` for database operations
4. **Validate input** - Check request data before processing
5. **Return consistent responses** - Use the same response format

## Next Steps

- [Route Patterns](/core-concepts/route-patterns) - Understanding pattern matching
- [File-based Routing](/core-concepts/file-based-routing) - Core routing concepts
- [Request Handling](/core-concepts/request-handling) - Working with DeserveRequest
