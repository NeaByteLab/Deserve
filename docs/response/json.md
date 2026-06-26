---
description: "Send JSON responses with ctx.send.json(), including status codes and headers."
---

# JSON Responses

The `ctx.send.json()` method creates JSON responses. It serializes the data with `JSON.stringify()` and sets `Content-Type: application/json` automatically.

## Basic Usage

```typescript twoslash
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  // Sends application/json by default
  return ctx.send.json({
    message: 'Hello World'
  })
}
```

## With Status Codes

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export async function POST(ctx: Context): Promise<Response> {
  // Read parsed request body
  const data = await ctx.get.body()
  // Reply Created with status 201
  return ctx.send.json(
    { message: 'Created successfully', data },
    { status: 201 }
  )
}
```

The `status` value must be an integer in the 200-599 range, or one of the body-less codes `101`, `204`, `205`, and `304` which send an empty body. Any other value throws `Deno.errors.InvalidData`. This rule is shared by every `ctx.send` helper.

Here `ctx.get.body()` returns whatever the client sent, so a handler that depends on its shape runs a [validation](/middleware/validation/overview) contract first and reads typed data that already passed.

## With Custom Headers

Headers set through `ctx.set.header()` merge into the response. Options headers take precedence when they conflict:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Set a header before sending
  ctx.set.header('Cache-Control', 'no-cache')
  return ctx.send.json({
    data: 'sensitive'
  })
}
```

Headers can also be passed through the options:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  return ctx.send.json(
    { data: 'sensitive' },
    {
      headers: {
        'Cache-Control': 'no-cache',
        'X-Request-ID': 'abc123'
      }
    }
  )
}
```

## Complex Data

Nested objects and arrays serialize as-is:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
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

A handler can shape a one-off error body like this:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Error body with status 404
  return ctx.send.json(
    { error: 'User not found' },
    { status: 404 }
  )
}
```

A thrown error routes through one place instead, covered in [Error Object Details](/error-handling/object-details). For consistent error shapes across the app, use [`ctx.handleError()`](/core-concepts/context-object#error-handling) rather than building each response by hand.

## Method Signature

```typescript
ctx.send.json<T = unknown>(data: T, options?: SendInit): Response
```

- **data** - value to serialize as JSON
- **options** - optional `status` and `headers`
