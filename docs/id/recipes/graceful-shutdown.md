---
description: 'Hentikan server Deserve dengan bersih pada SIGINT atau SIGTERM, kuras request yang sedang berjalan, dan jalankan kerja shutdown dengan AbortSignal.'
---

# Graceful Shutdown

Graceful shutdown menghentikan server menerima koneksi baru sambil membiarkan request yang sedang berjalan selesai, jadi deploy atau restart kontainer tidak pernah memotong response di tengah jalan. Deserve menangani ini secara bawaan, dan sebuah [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) membuka jalan untuk memicunya dari kode.

## Penanganan Sinyal Bawaan

`router.serve()` polos sudah mendengarkan sinyal yang dikirim process manager saat berhenti. Pada `SIGINT` (`Ctrl+C` di terminal) atau `SIGTERM` (yang dikirim Docker dan kebanyakan orchestrator), server berhenti menerima request baru, menguras yang masih berjalan, lalu meresolusi promise `serve()`:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routesDir: './routes'
})

// Resolusi setelah pengurasan selesai
await router.serve(8000)

// Tercapai hanya setelah shutdown bersih
console.log('Server stopped')
```

Windows mendengarkan `SIGINT` saja, karena `SIGTERM` tidak dikirim di sana. Tidak ada penyetelan yang diperlukan untuk jalur ini, jadi server dalam kontainer sudah keluar dengan bersih saat `docker stop`.

## Memicu Shutdown Dari Kode

Meneruskan `AbortSignal` sebagai argumen ketiga menyerahkan pemicu ke aplikasi, yang cocok untuk test yang perlu menghentikan server atau route admin yang mengakhiri proses. Membatalkan controller menguras server dengan cara yang sama seperti sinyal:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routesDir: './routes'
})
// ---cut---
const controller = new AbortController()

// Hentikan server setelah tiga puluh detik
setTimeout(() => controller.abort(), 30_000)

// Abort menguras, lalu serve resolusi
await router.serve(8000, '0.0.0.0', controller.signal)
```

Menyerahkan `AbortSignal` mengambil alih pemicu berhenti, jadi listener bawaan `SIGINT` dan `SIGTERM` tetap mati dan controller menjadi satu-satunya cara berhenti. Saat keduanya diinginkan, sambungkan dengan membatalkan controller dari dalam listener sinyal.

## Menjalankan Kerja Saat Shutdown

Pembersihan seperti menutup pool basis data atau membilas buffer berada setelah pengurasan, bukan di dalamnya. Event [`server:shutdown`](/id/middleware/observability/events#server) menyala setelah server selesai dikuras, jadi satu listener [observability](/id/middleware/observability/overview) menjaga kerja shutdown tetap di satu tempat:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routesDir: './routes'
})
// ---cut---
router.on((event) => {
  // Berjalan setelah pengurasan selesai
  if (event.kind === 'server:shutdown') {
    console.log('Closing resources')
  }
})

await router.serve(8000)
```

Event pasangannya [`server:listening`](/id/middleware/observability/events#server) menyala saat server mengikat port, jadi kait startup dan shutdown berdampingan di bus yang sama.

## Arti Pengurasan Bagi Sebuah Request

Request yang sedang berjalan saat pengurasan mulai akan tuntas sampai selesai, dan response-nya tetap terkirim. Koneksi yang tiba setelah pengurasan dimulai ditolak, karena listener sudah berhenti menerima. Response berumur panjang adalah satu hal yang perlu diperhatikan, karena [stream](/id/recipes/streaming-data) atau [WebSocket](/id/middleware/websocket) yang terbuka menahan pengurasan sampai koneksi itu ditutup. Membatasi berapa lama satu request boleh berjalan dengan [`requestTimeoutMs`](/id/getting-started/routes-configuration#requesttimeoutms) menjaga pengurasan tidak menunggu selamanya pada handler yang lambat.
