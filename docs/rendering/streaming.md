---
description: "Streaming template rendering in Deserve for faster time-to-first-byte responses."
---

# Streaming Template Rendering

Streaming template rendering sends HTML as it is produced, which lowers time-to-first-byte (TTFB) and keeps large pages feeling responsive. It is the progressive counterpart to the regular render covered in [Rendering Overview](/rendering/).

## Basic Concept

Instead of waiting for the whole template to finish, streaming sends the HTML chunk by chunk:

```typescript
// Regular render (blocking) - wait for everything to complete
return await ctx.render('large-template', data)

// Streaming render (progressive) - send chunk by chunk
return await ctx.streamRender('large-template', data)
```

## Basic Usage

### 1. In Context Handler

`ctx.streamRender()` returns a streaming HTML response, so awaiting it is all that a route needs:

```typescript twoslash
import type { Context, DataRecord } from '@neabyte/deserve'
declare function getUser(): DataRecord
declare function getAnalytics(): DataRecord
// ---cut---
// routes/dashboard.ts

// Streaming render complex dashboard
export async function GET(ctx: Context): Promise<Response> {
  return await ctx.streamRender('dashboard', {
    user: getUser(),
    analytics: getAnalytics()
  })
}
```

### 2. Custom Response Headers

The view engine lives in framework state, so `ctx.getState` reaches it for full control over the streamed response:

```typescript twoslash
import type { Context, DataRecord, ViewEngine } from '@neabyte/deserve'
declare const reportData: DataRecord
// ---cut---
// Access view engine from framework state
export async function GET(ctx: Context): Promise<Response> {
  const view = ctx.getState<ViewEngine>('view' as never)
  const stream = await view!.streamRender('report', reportData)
  return ctx.send.stream(
    stream,
    { headers: { 'Cache-Control': 'no-cache' } },
    'text/html; charset=utf-8'
  )
}
```

## Template Support

All DVE features from [Template Syntax](/rendering/syntax) work with streaming:

```html
<!-- views/streaming-demo.dve -->
<!DOCTYPE html>
<html>
  <head>
    <title>{{title}}</title>
  </head>
  <body>
    <header>{{header}}</header>

    <!-- Each loop streams item by item -->
    {{#each items as item}}
    <div class="item">
      <h3>{{item.name}}</h3>
      <p>{{item.description}}</p>
    </div>
    {{/each}}

    <!-- Conditional rendering -->
    {{#if showFooter}}
    <footer>{{footer}}</footer>
    {{/if}}
  </body>
</html>
```

## Best Use Cases

### 1. Large Templates

```typescript twoslash
import type { Context, DataRecord } from '@neabyte/deserve'
declare function getTransactions(): Promise<DataRecord[]>
declare function calculateSummary(): DataRecord
// ---cut---
// Report with thousands of data rows
export async function GET(ctx: Context): Promise<Response> {
  return await ctx.streamRender('financial-report', {
    transactions: await getTransactions(), // 10,000+ items
    summary: calculateSummary()
  })
}
```

### 2. Real-time Data

```typescript twoslash
import type { Context, DataRecord } from '@neabyte/deserve'
declare function getLatestMetrics(): DataRecord
declare function getActiveAlerts(): DataRecord
// ---cut---
// Dashboard with live data
export async function GET(ctx: Context): Promise<Response> {
  return await ctx.streamRender('live-dashboard', {
    metrics: getLatestMetrics(),
    alerts: getActiveAlerts()
  })
}
```

### 3. Progressive Enhancement

```typescript twoslash
import type { Context, DataRecord } from '@neabyte/deserve'
declare function getLayoutData(): DataRecord
declare function getContent(): Promise<DataRecord>
declare function getAnalytics(): Promise<DataRecord>
// ---cut---
// Send skeleton first, data streams in
export async function GET(ctx: Context): Promise<Response> {
  return await ctx.streamRender('progressive-app', {
    layout: getLayoutData(), // Fast
    content: await getContent(), // Slow
    analytics: await getAnalytics() // Very slow
  })
}
```

## Migration from Regular Render

```typescript
// Before (blocking) - wait for everything to complete
export async function GET(ctx: Context): Promise<Response> {
  return await ctx.render('large-template', data)
}

// After (streaming) - send progressively
export async function GET(ctx: Context): Promise<Response> {
  return await ctx.streamRender('large-template', data)
}
```

Streaming rendering lifts performance for large templates and real-time pages, and the API stays the same single await that a regular render uses.
