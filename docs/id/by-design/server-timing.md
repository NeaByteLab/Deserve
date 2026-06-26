---
description: "Kenapa Deserve tidak punya middleware Server-Timing, karena siklus hidup sudah mengukur durasi dan header-nya satu baris."
---

# Server-Timing

Deserve tidak punya middleware Server-Timing. Durasi yang akan dilaporkannya sudah diukur oleh [event siklus hidup](/id/middleware/observability/overview), dan mengirim header-nya adalah satu baris ketika sebuah rute mau.

## Kenapa Tidak Dibawa

Header [`Server-Timing`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Server-Timing) memunculkan metrik sisi server di DevTools browser, jadi sebuah request menunjukkan berapa lama sebuah tahap memakan waktu. Sebuah middleware yang menambahkannya untuk setiap response membuat dua asumsi untuk seluruh aplikasi sekaligus, metrik mana yang dipaparkan dan kepada siapa.

Metrik itu adalah detail satu handler, bukan kebijakan seluruh framework. Satu rute mengukur panggilan database, lain mengukur render, dan endpoint publik mungkin tak mau mengungkap timing sama sekali. Jadi keputusannya adalah membiarkan header ke rute yang tahu apa yang layak diukur, dan menjaga pengukuran di tempat ia sudah tinggal.

## Durasi Sudah Diukur

Setiap event `request:completed` membawa `durationMs`, waktu terukur untuk seluruh request, di samping `route` dan `method`. Untuk dashboard dan log itulah angka yang dibaca, tanpa header dan tanpa kode per-rute. Lihat [Request Logging](/id/middleware/observability/logging) untuk mengubahnya jadi baris log.

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routes: { directory: './routes' }
})
// ---cut---
router.on((event) => {
  // Baca durasi request terukur
  if (event.kind === 'request:completed') {
    const { route, durationMs } = event.metadata as { route?: string, durationMs: number }
    console.log(`${route ?? 'unknown'} took ${Math.round(durationMs)}ms`)
  }
})

await router.serve(8000)
```

## Mengirim Header Ketika Diinginkan

Untuk sebuah rute yang memang mau metrik itu di DevTools, header-nya adalah satu panggilan [`ctx.set.header`](/id/core-concepts/context-object#ctx-set-header-key-value). Ukur kerjanya, lalu tulis sebuah entri `Server-Timing` dengan nama dan durasi dalam milidetik.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export async function GET(ctx: Context): Promise<Response> {
  // Ukur kerja yang dipedulikan rute ini
  const start = performance.now()
  const data = await loadData()
  const ms = (performance.now() - start).toFixed(1)

  // Paparkan ke DevTools untuk rute ini
  ctx.set.header('Server-Timing', `db;dur=${ms}`)
  return ctx.send.json(data)
}

declare function loadData(): Promise<unknown>
```

Header menamai tahap yang penting untuk rute ini, yang lebih berguna ketimbang angka pukul rata yang harus ditebak framework. Untuk melacak sebuah request lintas layanan alih-alih mengukur satu tahap, lihat [Distributed Tracing](/id/by-design/tracing).
