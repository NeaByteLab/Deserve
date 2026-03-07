# Response JSON

Method `ctx.send.json()` membuat response JSON.

## Penggunaan Dasar

```typescript
// 1. Import tipe Context
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  // 2. Kirim object sebagai JSON (Content-Type otomatis application/json)
  return ctx.send.json({ message: 'Hello World' })
}
```

## Dengan Status Code Kustom

```typescript
export async function POST(ctx: Context): Promise<Response> {
  // 1. Baca body request
  const data = await ctx.body()
  // 2. Kirim JSON dengan status 201 (Created)
  return ctx.send.json(
    {
      message: 'Created successfully',
      data
    },
    { status: 201 }
  )
}
```

## Dengan Header Kustom

```typescript
export function GET(ctx: Context): Response {
  // 1. Atur header sebelum kirim
  ctx.setHeader('Cache-Control', 'no-cache')
  // 2. Kirim JSON (header ikut terkirim)
  return ctx.send.json({ data: 'sensitive' })
}
```

## Data Kompleks (Object Bersarang)

```typescript
export function GET(ctx: Context): Response {
  // 1. Siapkan data (bisa dari DB, API, dll.)
  const data = {
    users: [
      { id: 1, name: 'Alice', email: 'alice@example.com' },
      { id: 2, name: 'Bob', email: 'bob@example.com' }
    ],
    pagination: { page: 1, total: 2, hasNext: false },
    timestamp: new Date().toISOString()
  }
  // 2. Kirim sebagai JSON
  return ctx.send.json(data)
}
```

## Error Response

```typescript
export function GET(ctx: Context): Response {
  // 1. Kirim error message dengan status 404
  return ctx.send.json(
    {
      error: 'User not found'
    },
    { status: 404 }
  )
}
```
