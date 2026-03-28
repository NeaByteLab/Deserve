# Streaming Template Rendering

> [!WARNING]
> Fitur ini masih dalam pengembangan dan belum dirilis secara resmi.

Streaming template rendering memungkinkan Anda mengirim HTML, mengurangi time-to-first-byte (TTFB) dan meningkatkan user experience untuk template besar.

## Konsep Dasar

Daripada menunggu template render, streaming mengirim HTML chunk by chunk:

```typescript
// Render biasa (blocking) - tunggu semua selesai
const html = await view.render('large-template', data)
return ctx.send.html(html)

// Streaming render (progressive) - kirim chunk by chunk
const stream = view.streamRender('large-template', data)
return ctx.send.stream(stream, undefined, 'text/html; charset=utf-8')
```

## Penggunaan Dasar

### 1. Di Context Handler

Gunakan `ctx.streamRender()` untuk streaming HTML response:

```typescript
// routes/dashboard.ts
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  // Streaming render dashboard yang kompleks
  return ctx.streamRender('dashboard', {
    user: ctx.state.user,
    analytics: ctx.state.analytics
  })
}
```

### 2. Custom Response Headers

Gunakan `ctx.streamRender()` dengan custom headers:

```typescript
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  // Akses view engine dari context state
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

Semua fitur DVE template bekerja dengan streaming:

```dve
<!-- views/streaming-demo.dve -->
<!DOCTYPE html>
<html>
  <head>
    <title>{{judul}}</title>
  </head>
  <body>
    <header>{{header}}</header>

    <!-- Each loop akan streaming item by item -->
    {{#each items as item}}
    <div class="item">
      <h3>{{item.nama}}</h3>
      <p>{{item.deskripsi}}</p>
    </div>
    {{/each}}

    <!-- Conditional rendering -->
    {{#if tampilkanFooter}}
    <footer>{{footer}}</footer>
    {{/if}}
  </body>
</html>
```

## Use Case Terbaik

### 1. Template Besar

```typescript
// Report dengan ribuan baris data
export function GET(ctx: Context): Response {
  return ctx.streamRender('financial-report', {
    transactions: await getTransactions(), // 10,000+ items
    summary: calculateSummary()
  })
}
```

### 2. Real-time Data

```typescript
// Dashboard dengan data live
export function GET(ctx: Context): Response {
  return ctx.streamRender('live-dashboard', {
    metrics: getLatestMetrics(),
    alerts: getActiveAlerts()
  })
}
```

### 3. Progressive Enhancement

```typescript
// Kirim skeleton dulu, data mengalir
export function GET(ctx: Context): Response {
  return ctx.streamRender('progressive-app', {
    layout: getLayoutData(), // Fast
    content: await getContent(), // Slow
    analytics: getAnalytics() // Very slow
  })
}
```

## Migration dari Render Biasa

```typescript
// Sebelum (blocking) - tunggu semua selesai
export async function GET(ctx: Context): Promise<Response> {
  const html = await ctx.render('large-template', data)
  return html
}

// Sesudah (streaming) - kirim progresif
export function GET(ctx: Context): Response {
  return ctx.streamRender('large-template', data)
}
```

Streaming rendering meningkatkan performa secara signifikan untuk template besar dan aplikasi real-time. API yang sederhana dan mudah digunakan.
