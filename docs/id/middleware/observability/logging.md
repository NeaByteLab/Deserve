---
description: "Ubah event request Deserve menjadi log request terstruktur."
---

# Request Logging

Satu langganan [`router.on()`](/id/middleware/observability/overview) mengubah setiap request yang selesai menjadi access log terstruktur, tanpa kode logging di dalam handler.

![Setiap request yang selesai memancarkan request:complete dengan metrik selaras OpenTelemetry, dan request dengan status 400 atau lebih juga memancarkan request:error yang membawa error asli, jadi satu listener router.on menyebarkan amplop yang sama ke satu baris access log, peringatan request lambat yang disaring berdasarkan durasi, dan laporan error](/diagrams/obs-request-lifecycle.png)

## Access Log Dasar

Dengarkan `request:complete` dan cetak satu baris per request:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({ routesDir: './routes' })

// Satu baris log per request selesai
router.on((event) => {
  if (event.kind === 'request:complete') {
    const { method, url, statusCode, durationMs } = event.metadata as {
      method: string
      url: string
      statusCode: number
      durationMs: number
    }
    console.log(`${method} ${url} ${statusCode} ${Math.round(durationMs)}ms`)
  }
})

await router.serve(8000)
```

## Log JSON Terstruktur

Pancarkan JSON ketika pipeline log mengharapkan rekaman terstruktur:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({ routesDir: './routes' })
// ---cut---
router.on((event) => {
  if (event.kind === 'request:complete') {
    // Teruskan seluruh metadata sebagai JSON
    console.log(JSON.stringify({
      at: event.timestamp,
      ...event.metadata
    }))
  }
})
```

Metadata sudah mencakup field selaras-OpenTelemetry seperti `route`, `serverAddress`, `userAgent`, dan `requestSize`. Lihat [Referensi Event](/id/middleware/observability/events#request) untuk daftar lengkap.

## Mencatat Request Lambat

Saring berdasarkan durasi untuk memunculkan hanya lalu lintas lambat:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({ routesDir: './routes' })
// ---cut---
router.on((event) => {
  // Tandai request lebih lambat dari 500ms
  if (event.kind === 'request:complete') {
    const { url, durationMs } = event.metadata as { url: string; durationMs: number }
    if (durationMs > 500) {
      console.warn(`SLOW ${url} ${Math.round(durationMs)}ms`)
    }
  }
})
```

Untuk kegagalan, lihat [Pelaporan Error](/id/middleware/observability/errors).
