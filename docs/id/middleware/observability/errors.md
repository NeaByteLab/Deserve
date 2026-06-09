---
description: "Tangkap dan laporkan error dari Deserve memakai stream event observability."
---

# Pelaporan Error

Error muncul di bus [`router.on()`](/id/middleware/observability/overview) yang sama, jadi pelaporan tinggal di satu listener alih-alih tersebar di seluruh handler.

## Melaporkan Request Gagal

`request:error` menyala setiap kali status response `400` atau lebih tinggi, dan membawa error asli ketika ada:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({ routesDir: './routes' })

// Catat setiap request gagal
router.on((event) => {
  if (event.kind === 'request:error') {
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

`process:error` menyala untuk unhandled rejection, uncaught error, dan upaya terminasi yang diblokir. Router yang sedang melayani tetap berjalan dan melaporkan kesalahan alih-alih crash:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({ routesDir: './routes' })
// ---cut---
router.on((event) => {
  if (event.kind === 'process:error') {
    const { origin, error } = event.metadata as { origin: string; error: Error }
    // origin menunjuk sumber kesalahan
    console.error(`process fault [${origin}]`, error.message)
  }
})
```

## Memasangkan Dengan Penanganan Error

Dua hook menutup tugas berbeda:

- [`router.catch()`](/id/error-handling/object-details) membentuk response yang diterima klien.
- `router.on()` mencatat apa yang terjadi untuk log dan metrik.

Pakai `catch` untuk mengontrol balasan, dan `on` untuk mengamatinya. Pengaturan umum memasang keduanya:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({ routesDir: './routes' })
// ---cut---
// Bentuk response klien
router.catch((ctx, info) => {
  return ctx.send.json({ error: 'Something went wrong' }, { status: info.statusCode })
})

// Catat kegagalan untuk nanti
router.on((event) => {
  if (event.kind === 'request:error') {
    const { url, error } = event.metadata as { url: string; error?: Error }
    console.error(url, error?.message)
  }
})
```

Untuk response default ketika tidak ada handler diatur, lihat [Perilaku Default](/id/error-handling/default-behavior).
