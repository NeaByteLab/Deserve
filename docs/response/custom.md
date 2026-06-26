---
description: "Build fully custom responses with ctx.send.custom() when the helpers are not enough."
---

# Custom Responses

The `ctx.send.custom()` method creates responses with full control over the body. Unlike the typed helpers, it sets no `Content-Type` on its own, so add one through the headers when the body needs it.

## Basic Usage

```typescript twoslash
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  // Status and headers stay optional
  return ctx.send.custom('Custom response body')
}
```

## With Status Code

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Set the response status to 404
  return ctx.send.custom('Not Found', { status: 404 })
}
```

## With Custom Headers

Headers set through `ctx.set.header()` merge with headers from the options. Options headers take precedence when they conflict:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Header set on the context
  ctx.set.header('X-Custom', 'value')
  // Options can add more headers
  return ctx.send.custom('Response body', {
    headers: {
      'Content-Type': 'application/xml',
      'X-Additional': 'header'
    }
  })
}
```

## Streaming Responses

A `ReadableStream` passed as the body streams to the client without buffering the whole response. This suits large data or [server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events):

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
  return ctx.send.custom(stream, {
    headers: {
      'Content-Type': 'text/plain'
    }
  })
}
```

For template streaming, use [`ctx.render()`](/core-concepts/context-object#rendering-templates) with `stream: true` instead, which handles the DVE engine and content type for you.

## Binary Responses

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Send raw bytes with a type
  const binaryData = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f])
  return ctx.send.custom(binaryData, {
    headers: {
      'Content-Type': 'application/octet-stream'
    }
  })
}
```

## XML Response

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // XML string with an XML type
  const xml = '<?xml version="1.0"?><data><message>Hello</message></data>'
  return ctx.send.custom(xml, {
    headers: {
      'Content-Type': 'application/xml'
    }
  })
}
```

## Method Signature

```typescript
ctx.send.custom(body: BodyInit | null, options?: SendInit): Response
```

- **body** - any `BodyInit` value (string, `Blob`, `BufferSource`, `ReadableStream`, etc.) or `null`
- **options** - optional `status` and `headers`
