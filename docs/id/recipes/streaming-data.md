---
description: 'Dorong data ke klien chunk demi chunk dengan Server-Sent Events dan stream NDJSON di Deserve.'
---

# Streaming Data

Sebuah respons streaming mengirim body-nya potongan demi potongan dari waktu ke waktu alih-alih satu blob jadi, jadi bytes pertama mencapai klien jauh sebelum pekerjaan selesai. Deserve meneruskan [`ReadableStream`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) langsung lewat `ctx.send.custom()` ke respons native, jadi tiap `controller.enqueue()` meninggalkan server sebagai chunk-nya sendiri. Resep ini mencakup dua format yang paling sering muncul di produksi - [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) untuk dorongan langsung dan [NDJSON](https://github.com/ndjson/ndjson-spec) untuk dataset besar yang dibaca baris demi baris.

Untuk satu stream ter-buffer atau signature method-nya, lihat [respons stream](/id/response/custom). Untuk streaming HTML ter-render, lihat [streaming rendering](/id/rendering/streaming).

## Struktur Proyek

Kedua endpoint tinggal di [direktori routes](/id/core-concepts/file-based-routing) sebagai handler GET biasa, dan entri server hanya perlu menunjuk ke folder itu:

```
.
├── main.ts                  → Setup Router dan serve
└── routes/
    └── api/
        ├── events.ts        → GET /api/events (SSE)
        └── feed.ts          → GET /api/feed (NDJSON)
```

## Server-Sent Events

Server-Sent Events menjaga satu respons tetap terbuka dan mendorong frame teks saat terjadi, yang cocok untuk notifikasi langsung, progres, atau ticker metrik. Tiap frame adalah baris `data:` yang ditutup baris kosong, dan respons membawa tipe konten `text/event-stream` jadi browser memperlakukannya sebagai sumber event:

```typescript twoslash
import type { Context } from '@neabyte/deserve'

// routes/api/events.ts
export function GET(ctx: Context): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      for (let count = 1; count <= 3; count++) {
        // Baris data ditutup baris kosong
        controller.enqueue(encoder.encode(`data: tick ${count}\n\n`))
        // Tunggu sebelum dorongan berikutnya
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      controller.close()
    }
  })
  return ctx.send.custom(
    stream,
    {
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'text/event-stream'
      }
    }
  )
}
```

Header `Content-Type: text/event-stream` memberi tahu browser untuk memperlakukan respons sebagai sumber event, sementara `Cache-Control: no-cache` menghentikan proxy mem-buffer feed.

### Membaca Dari Browser

Sisi browser membaca endpoint yang sama lewat [`EventSource`](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) native, yang menyambung ulang sendiri dan memicu pesan untuk tiap frame:

```typescript twoslash
// Dengarkan stream event server
const source = new EventSource('/api/events')

source.onmessage = event => {
  // event.data menyimpan satu muatan frame
  console.log(event.data)
}
```

## Stream NDJSON

NDJSON mengirim satu objek JSON per baris, yang membuat klien mengurai tiap record saat tiba alih-alih menahan array raksasa di memori. Ini cocok untuk ekspor besar, log, atau hasil pencarian di mana baris diproduksi dari waktu ke waktu:

```typescript twoslash
import type { Context } from '@neabyte/deserve'

// routes/api/feed.ts
export function GET(ctx: Context): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      for (let id = 1; id <= 3; id++) {
        const row = JSON.stringify({ id })
        // Satu record per baris berakhiran newline
        controller.enqueue(encoder.encode(`${row}\n`))
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      controller.close()
    }
  })
  return ctx.send.custom(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson'
    }
  })
}
```

Memberikan header `Content-Type: application/x-ndjson` memberi tahu klien untuk memecah pada newline.

### Membaca Dari Klien

Sebuah reader fetch menarik bytes saat mendarat, dan memecah buffer pada newline mengubah stream byte menjadi record terurai:

```typescript twoslash
// Baca baris NDJSON sambil streaming
const response = await fetch('/api/feed')
const reader = response.body!.getReader()
const decoder = new TextDecoder()
let buffer = ''
while (true) {
  const { done, value } = await reader.read()
  if (done) {
    break
  }
  // Simpan baris parsial yang menggantung
  buffer += decoder.decode(value, {
    stream: true
  })
  const lines = buffer.split('\n')
  buffer = lines.pop() ?? ''
  for (const line of lines) {
    // Urai tiap baris JSON utuh
    console.log(JSON.parse(line))
  }
}
```

## Penutupan dan Error

Sebuah stream tetap terbuka sampai `controller.close()` jalan, jadi tiap loop butuh jalan keluar yang mencapainya. Melempar di dalam `start()` membuat stream error dan memutus koneksi, yang dilihat klien sebagai respons rusak alih-alih akhir bersih. Membungkus produsen dalam try dan memanggil `controller.error()` saat gagal menjaga niat itu tetap eksplisit:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Produksi chunk sampai pekerjaan selesai
        controller.enqueue(encoder.encode('data: start\n\n'))
        controller.close()
      } catch (error) {
        // Tandai stream sebagai gagal
        controller.error(error)
      }
    }
  })
  return ctx.send.custom(stream, {
    headers: {
      'Content-Type': 'text/event-stream'
    }
  })
}
```

Kesalahan tingkat rute di luar stream tetap mengalir ke handler terpusat dari [penanganan error](/id/error-handling/object-details), jadi jalur streaming hanya memiliki kegagalan yang terjadi saat memproduksi chunk.
