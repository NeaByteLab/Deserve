---
description: "Streaming template rendering di Deserve untuk response time-to-first-byte yang lebih cepat."
---

# Streaming Template Rendering

Streaming template rendering mengirim HTML saat diproduksi, yang menurunkan time-to-first-byte (TTFB) dan membuat halaman besar terasa responsif. Ini pasangan progresif dari render biasa yang dibahas di [Ringkasan Rendering](/id/rendering/).

## Konsep Dasar

Alih-alih menunggu seluruh template selesai, streaming mengirim HTML potongan demi potongan:

```typescript
// Render biasa (blocking) - tunggu semua selesai
return await ctx.render('large-template', data)

// Streaming render (progresif) - kirim potongan demi potongan
return await ctx.streamRender('large-template', data)
```

![Berdampingan, ctx.render membangun seluruh HTML jadi satu string lalu mengirim semuanya sekaligus sehingga klien menunggu, sementara ctx.streamRender mengompilasi di awal, mengembalikan ReadableStream, dan menulis tiap node saat diproduksi sehingga byte pertama keluar lebih cepat](/diagrams/stream-render-vs-blocking.png)

## Penggunaan Dasar

### 1. Di Context Handler

`ctx.streamRender()` mengembalikan response HTML streaming, jadi cukup di-await oleh rute:

![Rute meng-await ctx.streamRender, engine meresolusi dan mengompilasi template, membuat TransformStream, mengembalikan sisi readable seketika sehingga header response terkirim, lalu merender ke sisi writable di latar belakang di mana kegagalan muncul sebagai event view error](/diagrams/stream-render-pipeline.png)

```typescript twoslash
import type { Context, DataRecord } from '@neabyte/deserve'
declare function getUser(): DataRecord
declare function getAnalytics(): DataRecord
// ---cut---
// routes/dashboard.ts

// Streaming render dashboard kompleks
export async function GET(ctx: Context): Promise<Response> {
  return await ctx.streamRender('dashboard', {
    user: getUser(),
    analytics: getAnalytics()
  })
}
```

### 2. Header Response Khusus

View engine ada di framework state, jadi `ctx.getState` menjangkaunya untuk kontrol penuh atas response yang di-stream:

```typescript twoslash
import type { Context, DataRecord, ViewEngine } from '@neabyte/deserve'
declare const reportData: DataRecord
// ---cut---
// Akses view engine dari framework state
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

## Dukungan Template

Semua fitur DVE dari [Sintaks Template](/id/rendering/syntax) bekerja dengan streaming:

![Streaming melooping node template tingkat atas dan menulis tiap potongan yang diproduksi secara berurutan, jadi node teks ter-flush sendiri, tetapi blok each membangun semua barisnya jadi satu string dulu lalu ter-flush sebagai satu potongan, artinya granularitas streaming per node tingkat atas bukan per item loop](/diagrams/stream-render-chunks.png)

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

## Kasus Pakai Terbaik

### 1. Template Besar

```typescript twoslash
import type { Context, DataRecord } from '@neabyte/deserve'
declare function getTransactions(): Promise<DataRecord[]>
declare function calculateSummary(): DataRecord
// ---cut---
// Report dengan ribuan baris data
export async function GET(ctx: Context): Promise<Response> {
  return await ctx.streamRender('financial-report', {
    transactions: await getTransactions(), // 10,000+ items
    summary: calculateSummary()
  })
}
```

### 2. Data Real-time

```typescript twoslash
import type { Context, DataRecord } from '@neabyte/deserve'
declare function getLatestMetrics(): DataRecord
declare function getActiveAlerts(): DataRecord
// ---cut---
// Dashboard dengan data live
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
// Kirim skeleton dulu, data mengalir
export async function GET(ctx: Context): Promise<Response> {
  return await ctx.streamRender('progressive-app', {
    layout: getLayoutData(), // Fast
    content: await getContent(), // Slow
    analytics: await getAnalytics() // Very slow
  })
}
```

## Migrasi dari Render Biasa

```typescript
// Sebelum (blocking) - tunggu semua selesai
export async function GET(ctx: Context): Promise<Response> {
  return await ctx.render('large-template', data)
}

// Sesudah (streaming) - kirim progresif
export async function GET(ctx: Context): Promise<Response> {
  return await ctx.streamRender('large-template', data)
}
```

Streaming rendering mengangkat performa untuk template besar dan halaman real-time, dan API-nya tetap satu await yang sama seperti render biasa.

![Perbandingan time to first byte di mana render membuat klien menunggu selama seluruh halaman dibangun sehingga byte pertama datang terlambat, melawan streamRender yang mem-flush node pertama tepat setelah compile sehingga byte pertama datang lebih awal sementara potongan berikutnya terus berdatangan sampai stream ditutup](/diagrams/stream-render-ttfb.png)
