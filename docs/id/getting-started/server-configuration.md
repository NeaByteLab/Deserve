---
description: "Konfigurasi cara server Deserve listen, shutdown dengan baik, dan melindungi proses."
---

# Konfigurasi Server

> **Referensi**: [Dokumentasi API Deno.serve](https://docs.deno.com/api/deno/~/Deno.serve)

Konfigurasi server Deserve dengan hostname binding, graceful shutdown, dan proteksi proses. Setiap opsi berada di objek [`RouterOptions`](/id/getting-started/routes-configuration) yang dioper ke `new Router(...)`.

## Setup Server Dasar

Cara paling sederhana memulai server. `Router` memindai `./routes` secara default, jadi tidak perlu konfigurasi untuk setup dasar:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()

// Bind 0.0.0.0 di port 8000
await router.serve(8000)
```

Ini memulai server di `0.0.0.0:8000`, yang mencakup semua interface.

## Method Serve

`router.serve()` menerima tiga parameter opsional:

```typescript
// Signature method
async serve(port?: number): Promise<void>
async serve(port?: number, hostname?: string): Promise<void>
async serve(port?: number, hostname?: string, signal?: AbortSignal): Promise<void>
```

Ketika `port` dihilangkan, server membaca `PORT` dari environment dan jatuh ke `8000`. Ketika `hostname` dihilangkan, ia bind ke `0.0.0.0`.

## Hostname Binding

### Bind ke Interface Spesifik

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Bind ke localhost saja
await router.serve(8000, '127.0.0.1')

// Bind ke semua interface (default)
await router.serve(8000, '0.0.0.0')

// Bind ke interface jaringan spesifik
await router.serve(8000, '192.168.1.100')
```

### Development vs Production

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Development - localhost saja
await router.serve(8000, '127.0.0.1')

// Production - semua interface
await router.serve(8000, '0.0.0.0')
```

## Request Timeout

Request timeout diatur dengan `timeoutMs` pada opsi router. Ketika middleware dan route handler tidak selesai dalam waktu itu, server membalas dengan **503 Service Unavailable**:

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  timeoutMs: 30_000
})
await router.serve(8000)
```

Hilangkan `timeoutMs` untuk tanpa timeout (default). Daftar lengkap opsi router ada di [Konfigurasi Routes](/id/getting-started/routes-configuration).

## Batas Iterasi Template

Opsi `views.maxIterations` membatasi iterasi per blok <code v-pre>{{#each}}</code> di template DVE, yang mencegah event loop kelaparan akibat satu perulangan tak terbatas. Default-nya `100_000`:

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  views: {
    directory: './views',
    maxIterations: 50_000
  }
})
await router.serve(8000)
```

Jika template melewati batas, server membalas dengan **400 Bad Request**. Dua batas pendamping, `views.maxRenderIterations` untuk anggaran perulangan seluruh halaman dan `views.maxOutputSize` untuk total karakter keluaran, berperilaku sama dan tercantum di [Konfigurasi Routes](/id/getting-started/routes-configuration#views). Perilaku rendering lengkap ada di [Performa dan Batas](/id/rendering/performance#batas-iterasi). Untuk dataset besar, gunakan [`ctx.render`](/id/core-concepts/context-object#merender-template) dengan `stream: true`. Untuk rendering berat CPU, pertimbangkan mengalihkan ke [worker pool](/id/recipes/worker-pool).

## Resolusi IP Klien

Opsi `trustProxy` mengontrol cara IP klien asli diresolusi ketika server berjalan di balik proxy atau load balancer. Tanpa itu, `ctx.get.ip()` mengembalikan peer TCP langsung:

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  trustProxy: [
    'loopback',
    '10.0.0.0/8'
  ]
})
await router.serve(8000)
```

Ketika peer langsung cocok dengan aturan tepercaya, Deserve membaca header forwarded untuk menemukan IP pengunjung asli. Ia memeriksa `CF-Connecting-IP` dan `X-Real-IP` lebih dulu, lalu menelusuri rantai `X-Forwarded-For` dan `Forwarded` [RFC 7239](https://datatracker.ietf.org/doc/html/rfc7239) dari kanan ke kiri melewati hop tepercaya.

`trustProxy` menerima nilai-nilai ini:

- **Nama preset** - `'loopback'`, `'linklocal'`, `'uniquelocal'`
- **IP persis atau rentang CIDR** - misalnya `'10.0.0.0/8'`
- **Sebuah predikat** - `(ip: string) => boolean`

IP yang diresolusi tersedia di konteks request lewat `ctx.get.ip()`:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // IP pengunjung asli setelah trustProxy
  const client = ctx.get.ip()
  // Peer TCP langsung, abaikan header forwarded
  const peer = ctx.get.ip({ direct: true })
  return ctx.send.json({
    client,
    peer
  })
}
```

Tanpa aturan `trustProxy` yang cocok, `ctx.get.ip()` dan `ctx.get.ip({ direct: true })` mengembalikan alamat peer langsung yang sama. [Middleware pembatasan IP](/id/middleware/ip) memakai `ctx.get.ip()` untuk aturan izin dan tolaknya.

## Graceful Shutdown

Sebuah `AbortSignal` mengendalikan graceful shutdown server:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
const ac = new AbortController()

await router.serve(8000, '127.0.0.1', ac.signal)

ac.abort()
```

### Penanganan Sinyal Proses

Tanpa `AbortSignal`, router mendengarkan `SIGINT`, `SIGTERM`, dan `SIGHUP` sendiri (hanya `SIGINT` dan `SIGBREAK` di Windows) dan menyelesaikan request berjalan dengan rapi pada salah satunya. Tidak perlu menyiapkan sinyal secara manual:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()

// Sinyal menuntaskan request otomatis
await router.serve(8000, '127.0.0.1')
```

Berikan `AbortSignal` ketika shutdown perlu dikendalikan dari kode alih-alih dari sinyal, seperti ditunjukkan di atas. Perlu dicatat `Deno.exit()` dan panggilan terminasi lain diblokir selama server berjalan, jadi andalkan `AbortController` atau penanganan sinyal bawaan ketimbang keluar manual. Lihat [Proteksi Proses](#proteksi-proses) untuk alasannya.

## Proteksi Proses

Router yang sedang melayani memasang sentinel proses yang menjaga service tetap hidup melewati kesalahan yang biasanya menjatuhkannya. Ini penting karena Deserve menjalankan banyak hal dalam satu proses - watcher [hot reload](/id/core-concepts/hot-reload), [worker pool](/id/recipes/worker-pool), dan sering beberapa [service berdampingan](/id/core-concepts/multi-service). Satu dependensi yang memanggil `Deno.exit()` semestinya tidak menjatuhkan semua service sekaligus.

### Apa yang Diblokir

Selama server berjalan, panggilan terminasi ini dicegat dan diubah jadi no-op:

- `Deno.exit()` dan `Deno.kill()` yang menyasar proses saat ini
- `process.exit()`, `process.abort()`, `process.reallyExit()`, dan `process.kill()` yang menyasar proses saat ini

`kill` yang menyasar PID lain tetap lolos, jadi hanya terminasi-diri yang diblokir. Sentinel dilepas setelah server berhenti, yang memulihkan perilaku normal.

### Tidak Diam

Setiap panggilan yang diblokir dilaporkan, tidak pernah ditelan dalam diam. Sentinel memancarkan event [`process:failed`](/id/middleware/observability/events) dengan `origin: 'process:exit'` dan pesan yang menyebut panggilan yang diblokir, misalnya `Blocked Deno.exit(0) process termination is not permitted from application code`. Unhandled rejection dan uncaught error muncul dengan cara yang sama dengan `origin: 'unhandledrejection'` atau `'uncaughterror'`.

Berlangganan untuk melihatnya:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
router.on((event) => {
  if (event.kind === 'process:failed') {
    const { origin, error } = event.metadata as { origin: string; error: Error }
    // Catat kesalahan yang diblokir atau tak tertangkap
    console.error(`[${origin}]`, error.message)
  }
})
```

Lihat [Pelaporan Error](/id/error-handling/object-details) untuk pola lengkapnya.

### Model Ancaman

Tujuannya adalah ketersediaan. Satu jalur kode yang cacat atau jahat semestinya tidak bisa membatalkan seluruh proses dan menolak layanan ke setiap rute dan service yang ditampungnya.

- **Penyalahgunaan rantai pasok** - dependensi transitif yang memanggil `process.exit()` atau `Deno.exit()`, baik karena kecelakaan maupun sebagai serangan, tidak bisa lagi membuat server crash. Ini selaras dengan [OWASP A03:2025 Software Supply Chain Failures](https://owasp.org/Top10/2025/A03_2025-Software_Supply_Chain_Failures/) dan [CWE-1395](https://cwe.mitre.org/data/definitions/1395.html).
- **Denial of service** - memblokir terminasi-diri menghapus tombol mematikan ketersediaan yang mudah, terkait [CWE-400](https://cwe.mitre.org/data/definitions/400.html) dan [CWE-730](https://cwe.mitre.org/data/definitions/730.html).
- **Kesalahan tak tertangkap** - menjebak unhandled rejection dan uncaught error mencegah satu request buruk mengakhiri proses, terkait [CWE-248](https://cwe.mitre.org/data/definitions/248.html).

Ini pertahanan upaya-terbaik, bukan sandbox. Pertahanan ini menyisip ke titik masuk terminasi yang diketahui ketimbang mengisolasi kode tak tepercaya, jadi ia memperkecil dampak kesalahan tanpa mengklaim menghentikan setiap penyalahgunaan yang mungkin. Pasangkan dengan flag izin Deno dan tinjauan dependensi untuk jaminan lebih kuat. Pendekatan berlapis terhadap kesalahan dibahas di [Pertahanan Berlapis](/id/error-handling/defense-in-depth).

## Pengujian Konfigurasi

### Uji Server Dasar

```bash
# Mulai server
deno run --allow-net --allow-read main.ts

# Uji endpoint
curl http://localhost:8000
```

### Uji Hostname Binding

```bash
# Bind ke localhost saja
deno run --allow-net --allow-read main.ts

# Harusnya berhasil
curl http://127.0.0.1:8000

# Harusnya gagal (jika bind ke 127.0.0.1 saja)
curl http://0.0.0.0:8000
```

### Uji Graceful Shutdown

```bash
# Mulai server
deno run --allow-net --allow-read main.ts

# Kirim SIGINT (Ctrl+C)
# Server harusnya shutdown dengan baik
```
