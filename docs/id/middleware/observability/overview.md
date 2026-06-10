---
description: "Ringkasan observability Deserve: event siklus hidup, logging, dan pelaporan error."
---

# Ringkasan Observability

Deserve memancarkan event siklus hidup dan error melalui event bus bawaan. Satu langganan `router.on()` menerima setiap event, yang menjaga logging, metrik, dan pelaporan error di satu tempat alih-alih menyebar panggilan `console.log` di seluruh handler.

Hook bergaya middleware ini duduk di samping router dan mengawasi semua yang terjadi, dari startup server sampai setiap request yang selesai.

![Sinyal server, rute, view, request, dan proses semua menyatu ke satu event bus yang menyebarkan tiap event ke satu listener router.on, tempat kamu menyaring berdasarkan kind event, dan emit jadi no-op selama belum ada listener terdaftar](/diagrams/obs-single-bus.png)

## Berlangganan Event

`router.on()` mendaftarkan listener dan mengembalikan fungsi berhenti berlangganan:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routesDir: './routes'
})

// Terima setiap event siklus hidup dan error
const off = router.on((event) => {
  console.log(event.kind, event.metadata)
})

await router.serve(8000)

// Berhenti mendengarkan nanti
off()
```

Listener menyala untuk semua jenis event, jadi penyaringan terjadi di dalam callback.

## Bentuk Event

Setiap event berbagi amplop yang sama:

```typescript
{
  type: 'internal' | 'external', // kanal asal
  kind: string,                  // nama event, seperti 'request:complete'
  metadata: { ... },             // field spesifik per jenis
  timestamp: number              // milidetik epoch
}
```

- **`type`** - `external` untuk lalu lintas klien normal, `internal` untuk kesalahan framework dan timeout. Sebuah event request bernilai `internal` ketika kesalahan framework atau timeout 503 sintetis yang memicunya, selain itu `external`. Setiap jenis lain selalu `internal`.
- **`kind`** - diskriminan yang dipakai untuk membedakan event.
- **`metadata`** - field readonly yang bergantung pada jenis.
- **`timestamp`** - kapan event dibuat.

Daftar lengkap jenis dan metadata-nya ada di [Referensi Event](/id/middleware/observability/events).

## Beda Dari Domain Event Bus

Observability bus melaporkan aktivitas framework seperti request, rute, view, dan kesalahan. Domain event bus membawa fakta aplikasi seperti `user:created`. Keduanya melayani tugas berbeda dan sering berjalan berdampingan. Lihat [pola domain event bus](/id/core-concepts/multi-service#event-bus) untuk berbagi event aplikasi antar service.

## Langkah Berikutnya

- [Referensi Event](/id/middleware/observability/events) - setiap jenis event dan metadata-nya.
- [Request Logging](/id/middleware/observability/logging) - ubah event menjadi access log terstruktur.
- [Pelaporan Error](/id/middleware/observability/errors) - catat kegagalan dan pasangkan dengan [penanganan error](/id/error-handling/object-details).
