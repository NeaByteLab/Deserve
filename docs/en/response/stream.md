# Stream Responses

The `ctx.send.stream()` method returns a response body from a `ReadableStream`, useful for streaming large data or server-sent events without full buffering.

## Basic Usage

```typescript
// 1. Import Context type
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  // 2. Create ReadableStream (example: send two text chunks)
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('Hello\n'))
      controller.enqueue(new TextEncoder().encode('World\n'))
      controller.close()
    }
  })
  // 3. Send response with stream body
  return ctx.send.stream(stream)
}
```

## With Custom Content-Type

The third parameter is the content type (default `application/octet-stream`):

```typescript
export function GET(ctx: Context): Response {
  // 1. Prepare stream (define elsewhere)
  const stream = new ReadableStream({ ... })
  // 2. Third param: content-type (default application/octet-stream)
  return ctx.send.stream(stream, undefined, 'text/plain')
}
```

## With Status And Headers

```typescript
export function GET(ctx: Context): Response {
  // 1. Prepare stream
  const stream = new ReadableStream({ ... })
  // 2. Second param: status + headers; third: content-type
  return ctx.send.stream(stream, {
    status: 200,
    headers: { 'X-Custom': 'value' }
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
- **options** - Optional; status and headers (ResponseInit)
- **contentType** - Optional; default `'application/octet-stream'`
