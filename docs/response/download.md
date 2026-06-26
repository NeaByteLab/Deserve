---
description: "Send file download responses with ctx.send.download(), including Content-Disposition and filename handling."
---

# Download Responses

The `ctx.send.download()` method sends a response that triggers a file download in the browser. It sets `Content-Disposition: attachment` with the given filename and defaults the `Content-Type` to `application/octet-stream`.

This replaces having separate helpers for files and in-memory data. The body can be a string, a `BufferSource` (like `Uint8Array`), or a `ReadableStream` - whatever the handler already has in hand.

## Basic Usage

```typescript twoslash
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  // String body with a download name
  const csv = 'name,age\nAlice,30\nBob,25'
  return ctx.send.download(csv, 'users.csv')
}
```

## Binary Data

A `Uint8Array` body works the same way:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Uint8Array body with a download name
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
  return ctx.send.download(png, 'image.png')
}
```

## Streaming From the Filesystem

To send a file from disk, open a `ReadableStream` and pass it as the body. The handler becomes `async` because `Deno.open` is async:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare function createFileStream(): ReadableStream<Uint8Array>
// ---cut---
export async function GET(ctx: Context): Promise<Response> {
  // Open file as a readable stream
  const stream = createFileStream()
  // Stream becomes the download body
  return ctx.send.download(stream, 'document.pdf')
}
```

A missing or unreadable file throws `Deno.errors.NotFound`. Catch it and forward to the [centralized error handler](/error-handling/object-details) for a consistent reply:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare function createFileStream(): ReadableStream<Uint8Array>
// ---cut---
export async function GET(ctx: Context): Promise<Response> {
  try {
    const stream = createFileStream()
    return ctx.send.download(stream, 'document.pdf')
  } catch (error) {
    // Route the failure through error handling
    return await ctx.handleError(404, error as Error)
  }
}
```

## With Custom Content Type

The default `Content-Type` is `application/octet-stream`. Override it through the options headers when the browser needs a specific type:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  const json = JSON.stringify({ data: 'value' })
  return ctx.send.download(
    json,
    'data.json',
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  )
}
```

## Dynamic File Generation

Build the payload at runtime and send it as a download without touching disk:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Build the payload at runtime
  const data = {
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  }
  const content = JSON.stringify(data, null, 2)
  // Download without touching disk
  return ctx.send.download(content, 'metadata.json')
}
```

## Filename Handling

The filename is sanitized before it reaches the `Content-Disposition` header:

- Directory paths are stripped, so `../secret.txt` becomes `secret.txt`
- Control characters are removed
- Non-ASCII characters get a `filename*=UTF-8''...` fallback alongside the ASCII name
- An empty or all-invalid filename falls back to `download`

## Method Signature

```typescript
ctx.send.download(
  body: ReadableStream<Uint8Array> | BufferSource | string,
  filename: string,
  options?: SendInit
): Response
```

- **body** - download content as a string, `BufferSource`, or `ReadableStream`
- **filename** - suggested download filename, sanitized automatically
- **options** - optional `status` and `headers`
