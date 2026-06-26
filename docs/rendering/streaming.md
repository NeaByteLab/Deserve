---
description: "Streaming template rendering in Deserve for faster time-to-first-byte responses."
---

# Streaming Template Rendering

Streaming rendering sends HTML as it is produced, which lowers time-to-first-byte (TTFB) and keeps large pages feeling responsive. It is the progressive counterpart to the buffered render covered in [Rendering Overview](/rendering/), and it runs through the same `ctx.render()` call.

## Buffered vs Streaming

`ctx.render()` buffers by default, building the whole page into one string before it sends. Passing `{ stream: true }` as the third argument switches to a `ReadableStream` that writes each node as it is produced:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
declare const data: Record<string, unknown>
// ---cut---
// Buffered: wait for the whole page
await ctx.render('large-template', data)

// Streaming: send chunk by chunk
await ctx.render('large-template', data, { stream: true })
```

![Side by side, the buffered render builds the whole HTML into one string and sends it all at once so the client waits, while the streaming render compiles up front, returns a ReadableStream, and writes each node as produced so the first bytes leave early](/diagrams/stream-render-vs-blocking.png)

## Usage

A streaming render is still a single `await`. The engine resolves and compiles the template up front, then returns a response whose body streams as it renders, so the route stays as small as a buffered one:

![The route awaits ctx.render with stream true, the engine resolves and compiles the template, returns the readable stream at once so response headers go out, then renders each node into the stream in the background where a failure surfaces as a view failed event](/diagrams/stream-render-pipeline.png)

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare function getUser(): Record<string, unknown>
declare function getAnalytics(): Record<string, unknown>
// ---cut---
// routes/dashboard.ts

// Stream a complex dashboard
export async function GET(ctx: Context): Promise<Response> {
  return await ctx.render('dashboard', {
    user: getUser(),
    analytics: getAnalytics()
  }, { stream: true })
}
```

The response carries `Content-Type: text/html; charset=utf-8`, the same as a buffered render, and the status defaults to `200`. Set a different status through the same options object alongside `stream`:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
declare const data: Record<string, unknown>
// ---cut---
// Stream with a custom status
await ctx.render('report', data, { status: 201, stream: true })
```

## Template Support

Every DVE feature from [Template Syntax](/rendering/syntax) works with streaming. The engine walks the top-level nodes and flushes each produced chunk in order, so a plain text node leaves on its own. An <code v-pre>{{#each}}</code> block builds all its rows first and flushes them as one chunk, which means the granularity is per top-level node rather than per loop item:

![Streaming loops the top-level template nodes and writes each produced chunk in order, so a text node flushes on its own, but an each block builds all its rows into one string first and then flushes as a single chunk, meaning the streaming granularity is per top-level node rather than per loop item](/diagrams/stream-render-chunks.png)

```html
<!-- views/streaming-demo.dve -->
<!DOCTYPE html>
<html>
  <head>
    <title>{{ title }}</title>
  </head>
  <body>
    <header>{{ header }}</header>

    <!-- Each block flushes as one chunk -->
    {{#each items as item}}
    <div class="item">
      <h3>{{ item.name }}</h3>
      <p>{{ item.description }}</p>
    </div>
    {{/each}}

    <!-- Conditional rendering -->
    {{#if showFooter}}
    <footer>{{ footer }}</footer>
    {{/if}}
  </body>
</html>
```

## Best Use Cases

Streaming pays off when the page is large or the data trickles in. A report with thousands of rows ships its first bytes long before the last row is ready:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare function getTransactions(): Promise<Record<string, unknown>[]>
declare function calculateSummary(): Record<string, unknown>
// ---cut---
// Report with thousands of rows
export async function GET(ctx: Context): Promise<Response> {
  return await ctx.render('financial-report', {
    transactions: await getTransactions(),
    summary: calculateSummary()
  }, { stream: true })
}
```

A dashboard that mixes fast and slow data benefits the same way, since the shell reaches the client while the slow parts resolve:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare function getLayoutData(): Record<string, unknown>
declare function getContent(): Promise<Record<string, unknown>>
declare function getAnalytics(): Promise<Record<string, unknown>>
// ---cut---
// Fast shell first, slow data after
export async function GET(ctx: Context): Promise<Response> {
  return await ctx.render('progressive-app', {
    layout: getLayoutData(),
    content: await getContent(),
    analytics: await getAnalytics()
  }, { stream: true })
}
```

## Error Handling

Streaming has two failure windows. A missing template or a compile error throws before the response starts, so it reaches the [centralized error handler](/error-handling/object-details) like a buffered render and shapes a normal status reply. A fault while producing chunks happens after the headers are already sent, so the response cannot change. That fault surfaces as a [`view:failed`](/middleware/observability/events#views) event on the [observability bus](/middleware/observability/overview) and the stream closes. That window is why heavy validation belongs before the stream rather than inside it.

## Migration from a Buffered Render

The switch is one argument, since the call stays the same:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const data: Record<string, unknown>
// ---cut---
// Before: buffered
export async function before(ctx: Context): Promise<Response> {
  return await ctx.render('large-template', data)
}

// After: streaming
export async function after(ctx: Context): Promise<Response> {
  return await ctx.render('large-template', data, { stream: true })
}
```

Streaming lifts performance for large templates and real-time pages while the route stays a single await:

![A time to first byte comparison where the buffered render makes the client wait while the whole page is built so the first byte lands late, against the streaming render which flushes the first node right after compile so the first byte lands early while later chunks keep arriving until the stream closes](/diagrams/stream-render-ttfb.png)
