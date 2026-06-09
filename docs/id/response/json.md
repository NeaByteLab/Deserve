---
description: "Kirim response JSON dengan ctx.send.json(), termasuk status code dan header."
---

# Response JSON

Method `ctx.send.json()` membuat response JSON.

## Penggunaan Dasar

```typescript twoslash
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  // Default application/json
  return ctx.send.json({ message: 'Hello World' })
}
```

## Dengan Status Code

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export async function POST(ctx: Context): Promise<Response> {
  const data = await ctx.body()
  // Balas Created dengan status 201
  return ctx.send.json(
    {
      message: 'Created successfully',
      data
    },
    { status: 201 }
  )
}
```

Nilai `status` harus integer dalam rentang 200-599, atau salah satu kode tanpa body 101, 204, 205, dan 304 yang mengirim body kosong. Nilai lain melempar `Deno.errors.InvalidData`. Aturan ini berlaku untuk setiap helper `ctx.send`.

## Dengan Header Kustom

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Atur header sebelum kirim
  ctx.setHeader('Cache-Control', 'no-cache')
  return ctx.send.json({ data: 'sensitive' })
}
```

## Data Kompleks

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Object bersarang diserialisasi apa adanya
  const data = {
    users: [
      {
        id: 1,
        name: 'Alice',
        email: 'alice@example.com'
      },
      {
        id: 2,
        name: 'Bob',
        email: 'bob@example.com'
      }
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

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Body error dengan status 404
  return ctx.send.json(
    { error: 'User not found' },
    { status: 404 }
  )
}
```
