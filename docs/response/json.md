# JSON Responses

The `Send.json()` method creates JSON responses.

## Basic Usage

```typescript
import { Send } from '@neabyte/deserve'

export function GET(req: Request): Response {
  return Send.json({ message: 'Hello World' })
}
```

## With Status Codes

```typescript
export function POST(req: Request): Response {
  return Send.json(
    { message: 'Created successfully' },
    { status: 201 }
  )
}
```

## With Custom Headers

```typescript
export function GET(req: Request): Response {
  return Send.json(
    { data: 'sensitive' },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache',
        'X-Custom-Header': 'value'
      }
    }
  )
}
```

## Complex Data

```typescript
export function GET(req: Request): Response {
  const data = {
    users: [
      { id: 1, name: 'Alice', email: 'alice@example.com' },
      { id: 2, name: 'Bob', email: 'bob@example.com' }
    ],
    pagination: {
      page: 1,
      total: 2,
      hasNext: false
    },
    timestamp: new Date().toISOString()
  }
  return Send.json(data)
}
```

## Error Responses

```typescript
export function GET(req: Request): Response {
  return Send.json(
    { error: 'User not found' },
    { status: 404 }
  )
}
```

## Next Steps

- [Text Responses](/response/text) - Plain text responses
- [HTML Responses](/response/html) - Rich HTML content
- [Redirects](/response/redirect) - Redirect responses
