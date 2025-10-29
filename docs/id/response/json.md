# Response JSON

Method `ctx.send.json()` membuat response JSON.

## Penggunaan Dasar

```typescript
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  return ctx.send.json({ message: 'Hello World' })
}
```

## Dengan Status Code

```typescript
export async function POST(ctx: Context): Promise<Response> {
  const data = await ctx.body()
  return ctx.send.json({
    message: 'Created successfully', data
  }, { status: 201 })
}
```

## Dengan Custom Headers

```typescript
export function GET(ctx: Context): Response {
  ctx.setHeader('Cache-Control', 'no-cache')
  return ctx.send.json({ data: 'sensitive' })
}
```

## Data Kompleks

```typescript
export function GET(ctx: Context): Response {
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
  return ctx.send.json(data)
}
```

## Error Response

```typescript
export function GET(ctx: Context): Response {
  return ctx.send.json({
    error: 'User not found'
  }, { status: 404 })
}
```

