# Streaming Template Rendering

> [!WARNING]
> This feature is under development and not yet officially released.

Streaming template rendering allows you to send HTML, reducing time-to-first-byte (TTFB) and improving user experience for large templates.

## Basic Concept

Instead of waiting for template to render, streaming sends HTML chunk by chunk:

```typescript
// Regular render (blocking) - wait for everything to complete
const html = await view.render('large-template', data)
return ctx.send.html(html)

// Streaming render (progressive) - send chunk by chunk
const stream = view.streamRender('large-template', data)
return ctx.send.stream(stream, undefined, 'text/html; charset=utf-8')
```

## Basic Usage

### 1. In Context Handler

Use `ctx.streamRender()` for streaming HTML response:

```typescript
// routes/dashboard.ts
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  // Streaming render complex dashboard
  return ctx.streamRender('dashboard', {
    user: ctx.state.user,
    analytics: ctx.state.analytics
  })
}
```

### 2. Custom Response Headers

Use `ctx.streamRender()` with custom headers:

```typescript
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  // Access view engine from context state
  const stream = ctx.state.view.streamRender('report', reportData)
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache'
    }
  })
}
```

## Template Support

All DVE template features work with streaming:

```dve
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

```typescript
// Report with thousands of data rows
export function GET(ctx: Context): Response {
  return ctx.streamRender('financial-report', {
    transactions: await getTransactions(), // 10,000+ items
    summary: calculateSummary()
  })
}
```

### 2. Real-time Data

```typescript
// Dashboard with live data
export function GET(ctx: Context): Response {
  return ctx.streamRender('live-dashboard', {
    metrics: getLatestMetrics(),
    alerts: getActiveAlerts()
  })
}
```

### 3. Progressive Enhancement

```typescript
// Send skeleton first, data streams
export function GET(ctx: Context): Response {
  return ctx.streamRender('progressive-app', {
    layout: getLayoutData(), // Fast
    content: await getContent(), // Slow
    analytics: getAnalytics() // Very slow
  })
}
```

## Migration from Regular Render

```typescript
// Before (blocking) - wait for everything to complete
export async function GET(ctx: Context): Promise<Response> {
  const html = await ctx.render('large-template', data)
  return html
}

// After (streaming) - send progressively
export function GET(ctx: Context): Response {
  return ctx.streamRender('large-template', data)
}
```

Streaming rendering significantly improves performance for large templates and real-time applications. Simple API and easy to use.
