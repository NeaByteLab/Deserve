# Worker Pool

> **Referensi**: [Deno Workers API](https://docs.deno.com/runtime/manual/workers/)

Worker pool memindahkan pekerjaan yang berat di CPU ke sekumpulan Deno Worker agar main thread tetap responsif. Saat Anda mengonfigurasi worker pool, `ctx.state.worker` tersedia di route handler dan Anda bisa menjalankan tugas dengan `worker.run(payload)`.

## Kapan Menggunakan

Gunakan worker pool ketika sebuah route melakukan **pekerjaan berat di CPU** (misalnya kalkulasi berat, parsing, kompresi) yang bisa memblokir event loop. Untuk pekerjaan I/O (file, jaringan), main thread biasanya sudah cukup.

## Penggunaan Dasar

### 1. Konfigurasi Router dengan Worker

Berikan opsi `worker` saat membuat router. Anda harus menyediakan **URL skrip** yang mengarah ke modul (misalnya lewat `import.meta.resolve()` atau `URL.createObjectURL()` untuk kode inline):

```typescript
// 1. Import Router
import { Router } from '@neabyte/deserve'

// 2. Resolve URL skrip worker (harus berupa modul)
const workerScriptUrl = import.meta.resolve('./worker.ts')

// 3. Buat router dengan worker pool
const router = new Router({
  routesDir: './routes',
  worker: { scriptURL: workerScriptUrl, poolSize: 4 }
})

// 4. Jalankan server
await router.serve(8000)
```

### 2. Implementasi Skrip Worker

Skrip worker harus mendengarkan `message` dan membalas dengan `postMessage`. Payload dan hasil harus **structured-clone serializable** (tanpa fungsi atau symbol):

```typescript
// worker.ts
self.onmessage = (e: MessageEvent) => {
  const data = e.data as { iterations?: number }
  const n = Math.max(0, Number(data?.iterations) ?? 50_000)
  let value = 0
  for (let i = 0; i < n; i++) value += Math.sqrt(i)
  self.postMessage({ done: true, value })
}
```

Untuk melaporkan error dari worker, kirim objek dengan `error: true` dan opsional `message`:

```typescript
self.postMessage({ error: true, message: 'Komputasi gagal' })
```

### 3. Penggunaan di Route

Baca `ctx.state.worker` dan panggil `run(payload)`. Jika router dibuat tanpa `worker`, `ctx.state.worker` akan undefined; kembalikan 503 atau tangani sesuai kebutuhan:

```typescript
// routes/heavy.ts
import type { Context } from '@neabyte/deserve'

export async function GET(ctx: Context) {
  const worker = ctx.state['worker'] as { run: <T>(p: unknown) => Promise<T> } | undefined
  if (!worker?.run) {
    return ctx.send.json({ error: 'Worker tidak diaktifkan' }, { status: 503 })
  }
  const result = await worker.run<{ done: boolean; value: number }>({ iterations: 50_000 })
  return ctx.send.json({ value: result?.value })
}
```

## Opsi Router

### `scriptURL`

URL skrip worker. Harus mengarah ke **modul** (Deno menjalankan worker dengan `type: 'module'`). Sumber yang umum:

- **Path file:** `import.meta.resolve('./worker.ts')`
- **Skrip inline:** `URL.createObjectURL(new Blob([code], { type: 'application/javascript' }))`

### `poolSize`

Jumlah worker di pool. Default **4**. Minimum 1. Tugas didistribusikan round-robin.

```typescript
worker: { scriptURL: workerScriptUrl, poolSize: 8 }
```

## Contoh Lengkap (Worker Inline)

Menggunakan skrip worker inline dengan `Blob` dan `createObjectURL`:

```typescript
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
  worker: { scriptURL: workerScriptUrl, poolSize: 4 }
})

await router.serve(8000)
```

## Penanganan Error

- **Tanpa pool:** Jika router dibuat tanpa `worker`, `ctx.state.worker` undefined. Kembalikan 503 atau pesan yang jelas ketika route membutuhkan worker.
- **Error dari worker:** Jika worker memanggil `postMessage({ error: true, message: '...' })`, `worker.run()` akan reject dengan `Error` berisi pesan tersebut.
- **Worker crash:** Jika worker throw atau crash, `run()` reject dengan error worker generik.

Tangani error di route:

```typescript
try {
  const result = await worker.run(payload)
  return ctx.send.json(result)
} catch (err) {
  return ctx.handleError(500, err as Error)
}
```

## Structured Clone Saja

Payload dan hasil dikirim lewat `postMessage` / `onmessage`. Hanya data **structured-clone serializable** yang diperbolehkan: objek/array primitif, primitif, `Date`, `RegExp`, `Map`, `Set`, dll. Anda tidak bisa mengirim fungsi, symbol, atau instance class yang tidak bisa di-clone.
