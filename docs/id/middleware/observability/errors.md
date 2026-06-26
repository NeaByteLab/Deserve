---
description: "Tangkap dan laporkan error dari Deserve memakai stream event observability."
---

# Pelaporan Error

Error muncul di bus [`router.on()`](/id/middleware/observability/overview) yang sama, jadi pelaporan tinggal di satu listener alih-alih tersebar di seluruh handler.

## Melaporkan Request Gagal

`request:failed` menyala setiap kali status response `400` atau lebih tinggi, dan membawa error asli ketika ada:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routes: { directory: './routes' }
})

// Catat setiap request gagal
router.on((event) => {
  if (event.kind === 'request:failed') {
    const { method, url, statusCode, error } = event.metadata as {
      method: string
      url: string
      statusCode: number
      error?: Error
    }
    console.error(`${method} ${url} ${statusCode}`, error?.message)
  }
})

await router.serve(8000)
```

## Menangkap Kesalahan Proses

`process:failed` menyala untuk unhandled rejection, uncaught error, dan upaya terminasi yang diblokir. Router yang sedang melayani tetap berjalan dan melaporkan kesalahan alih-alih crash:

![Unhandled rejection, uncaught error, dan terminasi diri yang diblokir masing-masing jadi event process:failed yang membawa origin dan error-nya, jadi proses tetap berjalan tanpa downtime dan kesalahan tertangkap di listener router.on yang sama alih-alih hilang karena crash](/diagrams/obs-process-fault.png)

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routes: { directory: './routes' }
})
// ---cut---
router.on((event) => {
  if (event.kind === 'process:failed') {
    const { origin, error } = event.metadata as { origin: string; error: Error }
    // origin menunjuk sumber kesalahan
    console.error(`process fault [${origin}]`, error.message)
  }
})
```

## Menangkap Kesalahan Subsistem

Listener yang sama menangkap kesalahan dari worker pool dan middleware bawaan. Task yang timeout, worker yang crash, dispatch yang ditolak di bawah beban, cookie session yang gagal didekode, dan aturan CSRF yang melempar masing-masing tiba sebagai event-nya sendiri. Saring berdasarkan kind yang terdaftar di [Worker](/id/middleware/observability/events#worker) dan [Middleware Keamanan](/id/middleware/observability/events#middleware-keamanan) untuk merutekannya ke tempat log:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routes: { directory: './routes' }
})
// ---cut---
router.on((event) => {
  // Bereaksi pada kesalahan worker dan middleware
  if (event.kind === 'worker:crashed' || event.kind === 'session:invalid') {
    console.error(event.kind, event.metadata)
  }
})
```

## Memasangkan Dengan Penanganan Error

Membentuk response dan mencatat kegagalan adalah dua tugas terpisah. [`router.catch()`](/id/error-handling/object-details) mengontrol apa yang dilihat klien, sementara `router.on()` mencatat apa yang terjadi untuk log dan metrik. Keduanya berjalan independen, dan cara memasang keduanya dibahas di [Pertahanan Berlapis](/id/error-handling/defense-in-depth#mencatat-di-seluruh-lapisan).
