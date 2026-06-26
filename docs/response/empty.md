---
description: "Send empty responses with ctx.send.empty() for no-content status codes."
---

# Empty Responses

The `ctx.send.empty()` method sends a response with no body. It suits status codes like `204 No Content` where the response carries nothing but a status.

## Basic Usage

```typescript twoslash
import type { Context } from '@neabyte/deserve'

export function DELETE(ctx: Context): Response {
  // 204 No Content, empty body
  return ctx.send.empty(204)
}
```

## Without Status

Call `ctx.send.empty()` with no argument to send an empty body with the default status:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Empty body, default status
  return ctx.send.empty()
}
```

## With Headers

Headers set through `ctx.set.header()` still merge into an empty response:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function DELETE(ctx: Context): Response {
  // Set a header before sending
  ctx.set.header('X-Deleted-Resource', 'true')
  // 204 with the header attached
  return ctx.send.empty(204)
}
```

## Null Body Status Codes

The status codes `101`, `204`, `205`, and `304` always send a null body regardless of which `ctx.send` helper is used. Passing one of these to `ctx.send.json()` or `ctx.send.text()` also strips the body and the `Content-Type` header. `ctx.send.empty()` makes that intent explicit.

## Method Signature

```typescript
ctx.send.empty(status?: HttpStatusCode): Response
```

- **status** - optional HTTP status code, defaults to `200`
