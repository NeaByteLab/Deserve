---
description: "Mengalihkan kerja terikat-CPU ke pool worker Deno lewat API worker pool Deserve."
---

# Worker Pool

> **Referensi**: [API Workers Deno](https://docs.deno.com/runtime/manual/workers/)

Tugas terikat-CPU seperti matematika berat, parsing, atau kompresi memblokir event loop selama berjalan, jadi setiap request lain menunggu di belakangnya. Worker pool memindahkan kerja itu ke pool [Worker Deno](https://docs.deno.com/runtime/manual/workers/) yang berjalan di luar thread utama, jadi server tetap menjawab sementara komputasi terjadi di tempat lain. Kerja terikat-I/O seperti baca file atau panggilan jaringan sudah melepaskan loop, jadi tetap di thread utama tempatnya berada.

Setelah pool dikonfigurasi pada router, sebuah route menjangkaunya lewat [`ctx.get.worker()`](/id/core-concepts/context-object#ctx-get-worker) dan menyerahkan tugas dengan `run(payload)`.

## Mengonfigurasi Pool

Pool menyala lewat opsi `worker`, yang butuh sebuah **script URL** yang meresolusi ke modul. Panggilan `import.meta.resolve()` menunjuk ke file di disk, sementara `URL.createObjectURL()` membungkus kode inline:

```typescript twoslash
import { Router } from '@neabyte/deserve'

// Resolusi script worker sebagai modul
const workerScriptUrl = import.meta.resolve('./worker.ts')

// Aktifkan pool pada router
const router = new Router({
  routes: { directory: './routes' },
  worker: {
    scriptURL: workerScriptUrl,
    poolSize: 4
  }
})

await router.serve(8000)
```

## Menulis Script Worker

Script worker mendengarkan `message` dan membalas dengan `postMessage`. Payload dan hasil keduanya melintasi batas thread lewat structured clone, jadi hanya data yang dapat diserialisasi yang lewat, yang menyingkirkan fungsi dan simbol:

```typescript
// worker.ts
self.onmessage = (e: MessageEvent) => {
  const data = e.data as { iterations?: number }
  const n = Math.max(0, Number(data?.iterations) || 50_000)
  let value = 0
  for (let i = 0; i < n; i++) {
    value += Math.sqrt(i)
  }
  // Balas dengan hasil terhitung
  self.postMessage({
    done: true,
    value
  })
}
```

Sebuah worker melaporkan kegagalan dengan mengirim objek berisi `error: true` dan `message` opsional, yang muncul kembali di sisi pemanggil sebagai `run()` yang ditolak:

```typescript
// Laporkan kegagalan ke pemanggil
self.postMessage({
  error: true,
  message: 'Computation failed'
})
```

## Mengirim Dari Sebuah Route

Controller worker tinggal di `ctx.get.worker()`. Router yang dibuat tanpa opsi `worker` membiarkan controller tidak terpasang, jadi `ctx.get.worker()` melempar `NotSupported` saat sebuah route menjangkaunya. Membungkus dispatch dalam try membiarkan [error handler terpusat](/id/error-handling/object-details) membentuk balasan, di mana `NotSupported` dipetakan ke **501** dengan sendirinya:

```typescript twoslash
// routes/heavy.ts
import type { Context } from '@neabyte/deserve'

export async function GET(ctx: Context): Promise<Response> {
  try {
    // Melempar saat tanpa pool terkonfigurasi
    const worker = ctx.get.worker()
    // Kirim tugas ke worker pool
    const result = await worker.run<{ done: boolean; value: number }>({
      iterations: 50_000
    })
    return ctx.send.json({
      value: result?.value
    })
  } catch (error) {
    // Rutekan kegagalan lewat error handling
    return await ctx.handleError(500, error as Error)
  }
}
```

Sebuah tugas dikirim round-robin lintas pool, jadi request beruntun menyebar ke worker yang tersedia alih-alih mengantre pada satu.

## Menyetel Pool

### `scriptURL`

URL script worker, satu-satunya field wajib. Ia harus menunjuk ke modul, karena Deno menjalankan worker dengan `type: 'module'`. Dua sumber mencakup sebagian besar kasus:

- **Path file:** `import.meta.resolve('./worker.ts')`
- **Script inline:** `URL.createObjectURL(new Blob([code], { type: 'application/javascript' }))`

### `poolSize`

Jumlah worker dalam pool, default **4** dengan minimum 1. Sebuah tugas menyebar round-robin lintas worker ini, jadi pool yang lebih besar menyerap lebih banyak kerja paralel dengan biaya lebih banyak memori:

```typescript
worker: {
  scriptURL: workerScriptUrl,
  poolSize: 8
}
```

### `taskTimeoutMs`

Batas waktu per tugas dalam milidetik, default **5000**. Tugas yang berjalan melewatinya ditolak dengan error timeout, slot direklaim, dan worker dijalankan ulang. Reklaim ini muncul sebagai event [`worker:timeout`](/id/middleware/observability/events#worker) lalu [`worker:respawned`](/id/middleware/observability/events#worker):

```typescript
worker: {
  scriptURL: workerScriptUrl,
  taskTimeoutMs: 10_000
}
```

### `maxQueueDepth`

Batas tugas diterima-tapi-belum-selesai yang ditahan pool sebelum menolak pekerjaan baru, default jumlah worker dikali **8**, jadi pool 4 menahan hingga 32. Begitu batas tercapai, dispatch baru ditolak langsung alih-alih diantrekan, yang menjaga banjir pekerjaan tidak menumpuk tanpa batas:

```typescript
worker: {
  scriptURL: workerScriptUrl,
  poolSize: 4,
  maxQueueDepth: 64
}
```

### `maxQueueWaitMs`

Batas proyeksi tunggu, diukur sebagai jumlah pending pada slot terpilih dikali `taskTimeoutMs`, sebelum dispatch ditolak. Default adalah **2000**. Tugas yang seharusnya menunggu di belakang antrean panjang ditolak cepat alih-alih menunggu:

```typescript
worker: {
  scriptURL: workerScriptUrl,
  maxQueueWaitMs: 5_000
}
```

Dispatch yang ditolak langsung gagal dan muncul sebagai event [`worker:rejected`](/id/middleware/observability/events#worker), dengan `reason` berbunyi `queue-depth` saat `maxQueueDepth` memicunya atau `queue-wait` saat `maxQueueWaitMs` yang memicunya.

## Script Worker Inline

File `worker.ts` terpisah adalah tata letak paling jelas, tapi komputasi kecil cocok inline. Membungkus sumber dalam `Blob` dan menyerahkannya ke `URL.createObjectURL()` menghasilkan URL modul yang diterima pool, yang menjaga worker sekali pakai di file yang sama dengan router:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const workerCode = `
self.onmessage = (e) => {
  const data = e.data || {}
  const n = Math.max(0, Number(data.iterations) || 50000)
  let value = 0
  for (let i = 0; i < n; i++) value += Math.sqrt(i)
  self.postMessage({
    done: true,
    value
  })
}
export {}
`

const workerScriptUrl = URL.createObjectURL(
  new Blob(
    [workerCode],
    { type: 'application/javascript' }
  )
)

const router = new Router({
  routes: { directory: './routes' },
  worker: {
    scriptURL: workerScriptUrl,
    poolSize: 4
  }
})

await router.serve(8000)
```

## Bagaimana Kegagalan Muncul

Sebuah dispatch bisa gagal dalam beberapa cara, dan masing-masing menolak `run()` dengan error spesifik agar penyebabnya tetap terbaca:

- **Tanpa pool:** Router yang dibuat tanpa `worker` membiarkan `ctx.get.worker()` melempar `NotSupported`, yang dipetakan [error handler terpusat](/id/error-handling/object-details) ke **501**. Bungkus panggilan dalam try saat route harus membalas dengan pesan lebih jelas.
- **Error worker:** Ketika worker memanggil `postMessage({ error: true, message: '...' })`, `worker.run()` ditolak dengan `Error` yang membawa pesan itu. Tanpa pesan, error berbunyi `Worker returned an error with no message`.
- **Crash worker:** Ketika worker melempar atau crash, `run()` ditolak dengan `Worker task failed before responding`, dan slot pulih dengan sendirinya.
- **Timeout tugas:** Ketika tugas berjalan melewati `taskTimeoutMs` (default 5000), `run()` ditolak dengan `Worker task exceeded <ms>ms timeout`.
- **Ditolak di bawah beban:** Ketika pool mencapai `maxQueueDepth` atau proyeksi tunggu melewati `maxQueueWaitMs`, `run()` ditolak dengan error antrean-penuh atau slot-sibuk sebelum tugas sempat mulai.

Setiap kesalahan ini juga mengalir lewat bus observability sebagai [event worker](/id/middleware/observability/events#worker), jadi stall, crash, pemulihan, atau penolakan tetap terlihat tanpa menyentuh jalur request. Menangkap tugas yang ditolak dan meneruskannya ke [error handler terpusat](/id/error-handling/object-details) menjaga pembentukan response tetap di satu tempat:

```typescript
try {
  // Kirim tugas ke worker pool
  const result = await worker.run(payload)
  return ctx.send.json(result)
} catch (err) {
  // Rutekan kegagalan lewat error handling
  return await ctx.handleError(500, err as Error)
}
```

## Hanya Structured Clone

Payload dan hasil dikirim lewat `postMessage` / `onmessage`, jadi hanya data yang **dapat diserialisasi structured-clone** yang diizinkan, yang mencakup objek polos, array, primitif, `Date`, `RegExp`, `Map`, `Set`, dan nilai serupa. Fungsi, simbol, dan instance kelas yang tidak dapat diklon tidak bisa melewati batas itu. Lihat [algoritma structured clone](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm) di MDN untuk daftar lengkapnya.
