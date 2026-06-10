---
description: "Send streaming responses from a ReadableStream with ctx.send.stream()."
---

# Stream Responses

The `ctx.send.stream()` method returns a response body from a `ReadableStream`, useful for streaming large data or server-sent events without full buffering.

## Basic Usage

```typescript twoslash
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  // Push two text chunks then close
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('Hello\n'))
      controller.enqueue(new TextEncoder().encode('World\n'))
      controller.close()
    }
  })
  // Stream becomes the response body
  return ctx.send.stream(stream)
}
```

## With Custom Content-Type

The third parameter is the content type and it defaults to `application/octet-stream`:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('Hello'))
      controller.close()
    }
  })
  // Third arg sets the content type
  return ctx.send.stream(stream, undefined, 'text/plain')
}
```

## With Status And Headers

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('{"ok":true}\n'))
      controller.close()
    }
  })
  // Second arg status, third arg type
  return ctx.send.stream(stream, {
    status: 200,
    headers: {
      'X-Custom': 'value'
    }
  }, 'application/x-ndjson')
}
```

## Method Signature

```typescript
ctx.send.stream(
  stream: ReadableStream,
  options?: ResponseInit,
  contentType?: string
): Response
```

- **stream** - ReadableStream used as response body
- **options** - optional status and headers (ResponseInit)
- **contentType** - optional, defaults to `'application/octet-stream'`
