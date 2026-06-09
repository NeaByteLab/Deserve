---
description: "Mengalihkan kerja terikat-CPU ke pool worker Deno lewat API worker pool Deserve."
---

# Worker Pool

> **Referensi**: [API Workers Deno](https://docs.deno.com/runtime/manual/workers/)

Worker pool mengalihkan kerja terikat-CPU ke pool Worker Deno supaya thread utama tetap responsif. Setelah worker pool dikonfigurasi, route handler menjangkau handle worker lewat `ctx.getState('worker' as never)` dan mengirim tugas dengan `run(payload)`.

## Kapan Dipakai

Pakai worker pool ketika sebuah rute melakukan **kerja terikat-CPU** (misalnya matematika berat, parsing, kompresi) yang akan memblokir event loop. Untuk kerja terikat-I/O (berkas, jaringan), thread utama biasanya sudah cukup.

## Penggunaan Dasar

### 1. Konfigurasi Router dengan Worker

Berikan `worker` saat membuat router, bersama **script URL** yang meresolusi ke sebuah modul (misalnya lewat `import.meta.resolve()` atau `URL.createObjectURL()` untuk kode inline):

```typescript twoslash
import { Router } from '@neabyte/deserve'

// Resolusi script worker sebagai modul
const workerScriptUrl = import.meta.resolve('./worker.ts')

// Aktifkan pool pada router
const router = new Router({
  routesDir: './routes',
  worker: {
    scriptURL: workerScriptUrl,
    poolSize: 4
  }
})

await router.serve(8000)
```

### 2. Implementasi Script Worker

Script worker harus mendengarkan `message` dan membalas dengan `postMessage`. Payload dan hasil harus **dapat diserialisasi structured-clone** (tanpa fungsi atau simbol):

```typescript
// worker.ts
self.onmessage = (e: MessageEvent) => {
  const data = e.data as { iterations?: number }
  const n = Math.max(0, Number(data?.iterations) || 50_000)
  let value = 0
  for (let i = 0; i < n; i++) {
    value += Math.sqrt(i)
  }
  self.postMessage({
    done: true,
    value
  })
}
```

Untuk melaporkan error dari worker, kirim objek dengan `error: true` dan `message` opsional:

```typescript
self.postMessage({
  error: true,
  message: 'Computation failed'
})
```

### 3. Pakai di Rute

Handle worker tinggal di framework state, jadi `ctx.getState` menjangkaunya dengan tipe `WorkerRunHandle`. Router yang dibuat tanpa `worker` membiarkan handle undefined, yang merupakan momen untuk mengembalikan 503:

```typescript twoslash
// routes/heavy.ts
import type { Context, WorkerRunHandle } from '@neabyte/deserve'

export async function GET(ctx: Context): Promise<Response> {
  const worker = ctx.getState<WorkerRunHandle>('worker' as never)
  if (!worker) {
    return ctx.send.json({ error: 'Worker not enabled' }, { status: 503 })
  }
  const result = await worker.run<{ done: boolean; value: number }>({ iterations: 50_000 })
  return ctx.send.json({ value: result?.value })
}
```

## Opsi Router

### `scriptURL`

URL script worker. Harus menunjuk ke sebuah **modul** (Deno menjalankan worker dengan `type: 'module'`). Sumber umum:

- **Path berkas:** `import.meta.resolve('./worker.ts')`
- **Script inline:** `URL.createObjectURL(new Blob([code], { type: 'application/javascript' }))`

### `poolSize`

Jumlah worker dalam pool. Default adalah **4**. Minimum 1. Tugas dikirim round-robin.

```typescript
worker: {
  scriptURL: workerScriptUrl,
  poolSize: 8
}
```

### `taskTimeoutMs`

Timeout per tugas dalam milidetik. Default adalah **30000**. Tugas yang berjalan lebih lama ditolak dengan error timeout dan worker dilahirkan ulang.

```typescript
worker: {
  scriptURL: workerScriptUrl,
  taskTimeoutMs: 10_000
}
```

## Contoh Lengkap (Worker Inline)

Memakai script worker inline dengan `Blob` dan `createObjectURL`:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const workerCode = `
self.onmessage = (e) => {
  const data = e.data || {}
  const n = Math.max(0, Number(data.iterations) || 50000)
  let value = 0
  for (let i = 0; i < n; i++) value += Math.sqrt(i)
  self.postMessage({ done: true, value })
}
export {}
`

const workerScriptUrl = URL.createObjectURL(
  new Blob([workerCode], { type: 'application/javascript' })
)

const router = new Router({
  routesDir: './routes',
  worker: {
    scriptURL: workerScriptUrl,
    poolSize: 4
  }
})

await router.serve(8000)
```

## Penanganan Error

- **Tanpa pool:** Router yang dibuat tanpa `worker` membiarkan `ctx.getState('worker' as never)` undefined. Kembalikan 503 atau pesan jelas ketika rute butuh worker.
- **Error worker:** Ketika worker memanggil `postMessage({ error: true, message: '...' })`, `worker.run()` ditolak dengan `Error` yang membawa pesan itu. Tanpa pesan, error berbunyi `Worker returned an error with no message`.
- **Crash worker:** Ketika worker melempar atau crash, `run()` ditolak dengan `Worker task failed before responding`.
- **Timeout tugas:** Ketika tugas berjalan melewati `taskTimeoutMs` (default 30000), `run()` ditolak dengan `Worker task exceeded <ms>ms timeout`.

Tangkap tugas yang ditolak dan teruskan ke [error handler terpusat](/id/error-handling/object-details):

```typescript
try {
  const result = await worker.run(payload)
  return ctx.send.json(result)
} catch (err) {
  // Alihkan kegagalan lewat penanganan error
  return await ctx.handleError(500, err as Error)
}
```

## Hanya Structured Clone

Payload dan hasil dikirim lewat `postMessage` / `onmessage`, jadi hanya data yang **dapat diserialisasi structured-clone** yang diizinkan, yang mencakup objek polos, array, primitif, `Date`, `RegExp`, `Map`, `Set`, dan nilai serupa. Fungsi, simbol, dan instance kelas yang tidak dapat diklon tidak bisa melewati batas itu.
