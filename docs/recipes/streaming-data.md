---
description: 'Push data to the client chunk by chunk with Server-Sent Events and NDJSON streams in Deserve.'
---

# Streaming Data

A streaming response sends its body in pieces over time instead of one finished blob, so the first bytes reach the client long before the work is done. Deserve passes a [`ReadableStream`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) straight through `ctx.send.stream()` to the native response, so each `controller.enqueue()` leaves the server as its own chunk. This recipe covers the two formats that show up most in production - [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) for live push and [NDJSON](https://github.com/ndjson/ndjson-spec) for large datasets read line by line.

For a single buffered stream or the method signature, see [stream responses](/response/stream). For streaming rendered HTML, see [streaming rendering](/rendering/streaming).

## Project Structure

Both endpoints live in the [routes directory](/core-concepts/file-based-routing) as plain GET handlers, and the server entry only needs to point at that folder:

```
.
├── main.ts                  → Router setup and serve
└── routes/
    └── api/
        ├── events.ts        → GET /api/events (SSE)
        └── feed.ts          → GET /api/feed (NDJSON)
```

## Server-Sent Events

Server-Sent Events keep one response open and push text frames as they happen, which suits live notifications, progress, or a metrics ticker. Each frame is a `data:` line closed by a blank line, and the response carries the `text/event-stream` content type so the browser treats it as an event source:

```typescript twoslash
import type { Context } from '@neabyte/deserve'

// routes/api/events.ts
export function GET(ctx: Context): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      for (let count = 1; count <= 3; count++) {
        // Data line closed by blank line
        controller.enqueue(encoder.encode(`data: tick ${count}\n\n`))
        // Wait before the next push
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      controller.close()
    }
  })
  return ctx.send.stream(
    stream,
    {
      headers: {
        'Cache-Control': 'no-cache'
      }
    },
    'text/event-stream'
  )
}
```

The third argument sets the content type while the second carries the `Cache-Control: no-cache` header that stops a proxy from buffering the feed. A per-call `Content-Type` set this way wins over any generic context header, so the event stream keeps its type even alongside other headers.

### Reading From the Browser

The browser side reads the same endpoint through the native [`EventSource`](https://developer.mozilla.org/en-US/docs/Web/API/EventSource), which reconnects on its own and fires a message for every frame:

```typescript twoslash
// Listen to the server event stream
const source = new EventSource('/api/events')

source.onmessage = event => {
  // event.data holds one frame payload
  console.log(event.data)
}
```

## NDJSON Streams

NDJSON sends one JSON object per line, which lets a client parse each record as it arrives instead of holding a giant array in memory. It fits large exports, logs, or search results where rows are produced over time:

```typescript twoslash
import type { Context } from '@neabyte/deserve'

// routes/api/feed.ts
export function GET(ctx: Context): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      for (let id = 1; id <= 3; id++) {
        const row = JSON.stringify({ id })
        // One record per newline-ended line
        controller.enqueue(encoder.encode(`${row}\n`))
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      controller.close()
    }
  })
  return ctx.send.stream(stream, undefined, 'application/x-ndjson')
}
```

Passing `undefined` for the options keeps the defaults, while the third argument labels the body `application/x-ndjson` so the client knows to split on newlines.

### Reading From the Client

A fetch reader pulls bytes as they land, and splitting the buffer on newlines turns the byte stream into parsed records:

```typescript twoslash
// Read NDJSON rows while streaming
const response = await fetch('/api/feed')
const reader = response.body!.getReader()
const decoder = new TextDecoder()
let buffer = ''
while (true) {
  const { done, value } = await reader.read()
  if (done) {
    break
  }
  // Keep the trailing partial line buffered
  buffer += decoder.decode(value, {
    stream: true
  })
  const lines = buffer.split('\n')
  buffer = lines.pop() ?? ''
  for (const line of lines) {
    // Parse each completed JSON line
    console.log(JSON.parse(line))
  }
}
```

## Closing and Errors

A stream stays open until `controller.close()` runs, so every loop needs an exit that reaches it. Throwing inside `start()` errors the stream and drops the connection, which a client sees as a broken response rather than a clean end. Wrapping the producer in a try and calling `controller.error()` on failure keeps that intent explicit:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Produce chunks until the work ends
        controller.enqueue(encoder.encode('data: start\n\n'))
        controller.close()
      } catch (error) {
        // Mark the stream as failed
        controller.error(error)
      }
    }
  })
  return ctx.send.stream(stream, undefined, 'text/event-stream')
}
```

Route-level faults outside the stream still flow to the centralized handler from [error handling](/error-handling/object-details), so the streaming path only owns failures that happen while producing chunks.
