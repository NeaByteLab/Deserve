# JSON Responses

The `ctx.send.json()` method creates JSON responses.

## Basic Usage

```typescript
// 1. Import Context type
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  // 2. Send object as JSON (Content-Type auto application/json)
  return ctx.send.json({ message: 'Hello World' })
}
```

## With Status Codes

```typescript
export async function POST(ctx: Context): Promise<Response> {
  // 1. Read request body
  const data = await ctx.body()
  // 2. Send JSON with status 201 (Created)
  return ctx.send.json(
    { message: 'Created successfully', data },
    { status: 201 }
  )
}
```

## With Custom Headers

```typescript
export function GET(ctx: Context): Response {
  // 1. Set header before send
  ctx.setHeader('Cache-Control', 'no-cache')
  // 2. Send JSON (header sent with response)
  return ctx.send.json({ data: 'sensitive' })
}
```

## Complex Data

```typescript
export function GET(ctx: Context): Response {
  // 1. Prepare data (from DB, API, etc.)
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
  // 2. Send as JSON
  return ctx.send.json(data)
}
```

## Error Responses

```typescript
export function GET(ctx: Context): Response {
  // 1. Send error message with status 404
  return ctx.send.json(
    { error: 'User not found' },
    { status: 404 }
  )
}
```
