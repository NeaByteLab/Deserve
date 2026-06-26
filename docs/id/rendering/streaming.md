---
description: "Streaming template rendering di Deserve untuk response time-to-first-byte yang lebih cepat."
---

# Streaming Template Rendering

Streaming rendering mengirim HTML saat diproduksi, yang menurunkan time-to-first-byte (TTFB) dan membuat halaman besar terasa responsif. Ini pasangan progresif dari render ter-buffer yang dibahas di [Ringkasan Rendering](/id/rendering/), dan berjalan lewat panggilan `ctx.render()` yang sama.

## Buffered vs Streaming

`ctx.render()` mem-buffer secara default, membangun seluruh halaman menjadi satu string sebelum mengirim. Memberi `{ stream: true }` sebagai argumen ketiga beralih ke `ReadableStream` yang menulis tiap node saat diproduksi:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
declare const data: Record<string, unknown>
// ---cut---
// Buffered: tunggu seluruh halaman
await ctx.render('large-template', data)

// Streaming: kirim potongan demi potongan
await ctx.render('large-template', data, { stream: true })
```

![Berdampingan, render ter-buffer membangun seluruh HTML jadi satu string lalu mengirim semuanya sekaligus sehingga klien menunggu, sementara render streaming mengompilasi di awal, mengembalikan ReadableStream, dan menulis tiap node saat diproduksi sehingga byte pertama keluar lebih cepat](/diagrams/stream-render-vs-blocking.png)

## Penggunaan

Render streaming tetap satu `await`. Engine meresolusi dan mengompilasi template di awal, lalu mengembalikan response yang body-nya mengalir saat dirender, jadi rute tetap sekecil render ter-buffer:

![Rute meng-await ctx.render dengan stream true, engine meresolusi dan mengompilasi template, mengembalikan readable stream seketika sehingga header response terkirim, lalu merender tiap node ke stream di latar belakang di mana kegagalan muncul sebagai event view failed](/diagrams/stream-render-pipeline.png)

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare function getUser(): Record<string, unknown>
declare function getAnalytics(): Record<string, unknown>
// ---cut---
// routes/dashboard.ts

// Stream dashboard kompleks
export async function GET(ctx: Context): Promise<Response> {
  return await ctx.render('dashboard', {
    user: getUser(),
    analytics: getAnalytics()
  }, { stream: true })
}
```

Response membawa `Content-Type: text/html; charset=utf-8`, sama seperti render ter-buffer, dan status default ke `200`. Atur status berbeda lewat objek options yang sama bersama `stream`:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
declare const data: Record<string, unknown>
// ---cut---
// Stream dengan status khusus
await ctx.render('report', data, { status: 201, stream: true })
```

## Dukungan Template

Semua fitur DVE dari [Sintaks Template](/id/rendering/syntax) bekerja dengan streaming. Engine menelusuri node tingkat atas dan mem-flush tiap potongan yang diproduksi secara berurutan, jadi node teks polos keluar sendiri. Blok <code v-pre>{{#each}}</code> membangun semua barisnya dulu lalu mem-flush-nya sebagai satu potongan, artinya granularitasnya per node tingkat atas bukan per item perulangan:

![Streaming menelusuri node template tingkat atas dan menulis tiap potongan yang diproduksi secara berurutan, jadi node teks ter-flush sendiri, tetapi blok each membangun semua barisnya jadi satu string dulu lalu ter-flush sebagai satu potongan, artinya granularitas streaming per node tingkat atas bukan per item perulangan](/diagrams/stream-render-chunks.png)

```html
<!-- views/streaming-demo.dve -->
<!DOCTYPE html>
<html>
  <head>
    <title>{{ title }}</title>
  </head>
  <body>
    <header>{{ header }}</header>

    <!-- Blok each ter-flush sebagai satu chunk -->
    {{#each items as item}}
    <div class="item">
      <h3>{{ item.name }}</h3>
      <p>{{ item.description }}</p>
    </div>
    {{/each}}

    <!-- Rendering kondisional -->
    {{#if showFooter}}
    <footer>{{ footer }}</footer>
    {{/if}}
  </body>
</html>
```

## Kasus Pakai Terbaik

Streaming menunjukkan nilainya saat halaman besar atau datanya menetes masuk. Sebuah report dengan ribuan baris mengirim byte pertamanya jauh sebelum baris terakhir siap:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare function getTransactions(): Promise<Record<string, unknown>[]>
declare function calculateSummary(): Record<string, unknown>
// ---cut---
// Report dengan ribuan baris
export async function GET(ctx: Context): Promise<Response> {
  return await ctx.render('financial-report', {
    transactions: await getTransactions(),
    summary: calculateSummary()
  }, { stream: true })
}
```

Dashboard yang mencampur data cepat dan lambat mendapat manfaat sama, karena kerangkanya mencapai klien sementara bagian lambat masih diresolusi:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare function getLayoutData(): Record<string, unknown>
declare function getContent(): Promise<Record<string, unknown>>
declare function getAnalytics(): Promise<Record<string, unknown>>
// ---cut---
// Kerangka cepat dulu, data lambat menyusul
export async function GET(ctx: Context): Promise<Response> {
  return await ctx.render('progressive-app', {
    layout: getLayoutData(),
    content: await getContent(),
    analytics: await getAnalytics()
  }, { stream: true })
}
```

## Penanganan Error

Streaming punya dua jendela kegagalan. Template yang hilang atau error kompilasi terlempar sebelum response mulai, jadi hal itu mencapai [error handler terpusat](/id/error-handling/object-details) seperti render ter-buffer dan membentuk balasan status yang normal. Kegagalan saat memproduksi chunk terjadi setelah header sudah terkirim, jadi response tidak bisa berubah lagi. Kegagalan itu muncul sebagai event [`view:failed`](/id/middleware/observability/events#view) di [bus observability](/id/middleware/observability/overview) dan stream ditutup. Jendela itulah kenapa validasi berat sebaiknya sebelum stream, bukan di dalamnya.

## Migrasi dari Render Ter-buffer

Peralihannya satu argumen, karena panggilannya tetap sama:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const data: Record<string, unknown>
// ---cut---
// Sebelum: ter-buffer
export async function before(ctx: Context): Promise<Response> {
  return await ctx.render('large-template', data)
}

// Sesudah: streaming
export async function after(ctx: Context): Promise<Response> {
  return await ctx.render('large-template', data, { stream: true })
}
```

Streaming mengangkat performa untuk template besar dan halaman real-time sementara rute tetap satu await:

![Perbandingan time to first byte di mana render ter-buffer membuat klien menunggu selama seluruh halaman dibangun sehingga byte pertama datang terlambat, melawan render streaming yang mem-flush node pertama tepat setelah compile sehingga byte pertama datang lebih awal sementara potongan berikutnya terus berdatangan sampai stream ditutup](/diagrams/stream-render-ttfb.png)
