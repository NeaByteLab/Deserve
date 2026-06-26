---
description: "Send plain text responses with ctx.send.text()."
---

# Text Responses

The `ctx.send.text()` method creates plain text responses. It sets `Content-Type: text/plain; charset=utf-8` automatically.

## Basic Usage

```typescript twoslash
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  // Sends text/plain by default
  return ctx.send.text('Hello World')
}
```

## With Status Codes

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function POST(ctx: Context): Response {
  // Reply Not Implemented with 501
  return ctx.send.text('Not Implemented', { status: 501 })
}
```

The `status` value must be an integer in the 200-599 range, or one of the body-less codes `101`, `204`, `205`, and `304`. Any other value throws `Deno.errors.InvalidData`.

## With Custom Headers

Headers set through `ctx.set.header()` merge into the response. Options headers take precedence when they conflict:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Set a header before sending
  ctx.set.header('X-Custom', 'value')
  return ctx.send.text('Hello World', {
    headers: {
      'Content-Language': 'en'
    }
  })
}
```

## Error Messages

A handler can return a plain text error body, but a thrown error routes through one place instead, covered in [Error Object Details](/error-handling/object-details). For consistent error shapes, use [`ctx.handleError()`](/core-concepts/context-object#error-handling).

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Plain text error with status 500
  return ctx.send.text('Internal Server Error', { status: 500 })
}
```

## Method Signature

```typescript
ctx.send.text(text: string, options?: SendInit): Response
```

- **text** - plain text response body
- **options** - optional `status` and `headers`
