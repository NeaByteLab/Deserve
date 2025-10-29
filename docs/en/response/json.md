# JSON Responses

The `ctx.send.json()` method creates JSON responses.

## Basic Usage

```typescript
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  return ctx.send.json({ message: 'Hello World' })
}
```

## With Status Codes

```typescript
export async function POST(ctx: Context): Promise<Response> {
  const data = await ctx.body()
  return ctx.send.json({
    message: 'Created successfully', data
  }, { status: 201 })
}
```

## With Custom Headers

```typescript
export function GET(ctx: Context): Response {
  ctx.setHeader('Cache-Control', 'no-cache')
  return ctx.send.json({ data: 'sensitive' })
}
```

## Complex Data

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

## Error Responses

```typescript
export function GET(ctx: Context): Response {
  return ctx.send.json({
    error: 'User not found'
  }, { status: 404 })
}
```
