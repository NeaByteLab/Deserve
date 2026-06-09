---
description: "Send plain text responses with ctx.send.text()."
---

# Text Responses

The `ctx.send.text()` method creates plain text responses.

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

## Error Messages

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Plain text error with status 500
  return ctx.send.text('Internal Server Error', { status: 500 })
}
```

## Custom Headers

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Add headers through the options
  return ctx.send.text('Hello World', {
    headers: {
      'Content-Language': 'en',
      'X-Custom': 'value'
    }
  })
}
```
