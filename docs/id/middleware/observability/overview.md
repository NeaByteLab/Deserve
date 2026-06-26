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
  routes: { directory: './routes' }
})

// Terima setiap event siklus hidup dan error
const off = router.on((event) => {
  console.log(event.kind, event.metadata)
})

await router.serve(8000)

// Berhenti mendengarkan nanti
off()
```

Listener menyala untuk semua jenis event, jadi penyaringan terjadi di dalam callback. Tanpa listener terdaftar, emit jadi no-op dan tidak berbiaya, jadi bus tetap bebas sampai ada yang berlangganan.

## Bentuk Event

Setiap event berbagi amplop yang sama:

```typescript
{
  type: 'internal' | 'external', // kanal asal
  kind: string,                  // nama event, seperti 'request:completed'
  metadata: { ... },             // field spesifik per jenis
  timestamp: number              // milidetik epoch
}
```

- **`type`** - `external` untuk lalu lintas klien normal, `internal` untuk kesalahan framework. Sebuah event request bernilai `internal` ketika kesalahan framework, timeout 503 sintetis, atau context request yang hilang yang memicunya, selain itu `external`. Jenis `process:failed` adalah satu-satunya pengecualian yang selalu tetap `external`, karena proses yang crash berada di luar kanal request. Setiap jenis lain selalu `internal`.
- **`kind`** - diskriminan yang dipakai untuk membedakan event.
- **`metadata`** - field readonly yang bergantung pada jenis.
- **`timestamp`** - kapan event dibuat.

Daftar lengkap jenis dan metadata-nya ada di [Referensi Event](/id/middleware/observability/events).

## Beda Dari Domain Event Bus

Observability bus melaporkan aktivitas framework seperti request, rute, view, dan kesalahan. Domain event bus membawa fakta aplikasi seperti `user:created`. Keduanya melayani tugas berbeda dan sering berjalan berdampingan. Lihat [pola domain event bus](/id/core-concepts/multi-service#event-bus) untuk berbagi event aplikasi antar service.

## Jejak Audit Bawaan

Setiap subsistem melapor di bus yang sama, dari sinyal [server](/id/middleware/observability/events#server) dan [rute](/id/middleware/observability/events#rute) sampai kesalahan [worker](/id/middleware/observability/events#worker), [middleware keamanan](/id/middleware/observability/events#middleware-keamanan), dan [proses](/id/middleware/observability/events#process). Masing-masing tiba sebagai amplop `{ type, kind, metadata, timestamp }` yang sama, terstruktur dan bercap waktu pada saat ia menyala. Sebuah listener sederhana berubah menjadi jejak audit yang mencatat dirinya sendiri selama server berjalan, tanpa kabel tambahan.

Itu mencakup hal yang biasanya diminta oleh kerja kepatuhan dan keamanan, dan tiap kontrol memetakan ke perilaku yang sudah disediakan bus:

- **[SOC 2](https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-2) (pemantauan CC7)** ingin event relevan-keamanan tertangkap. Cookie yang dirusak (`session:invalid`), panggilan terminasi yang diblokir (`process:failed`), dan aturan CSRF yang gagal (`csrf:failed`) semua menyala sendiri.
- **[ISO/IEC 27001](https://www.iso.org/standard/27001) (logging A.8.15)** ingin log event yang bertahan dari waktu ke waktu. Setiap event membawa `timestamp` dalam milidetik epoch dan tiba terurut, jadi garis waktu direkonstruksi dengan rapi.
- **[PCI DSS](https://www.pcisecuritystandards.org/document_library/) (jejak audit Persyaratan 10)** ingin tiap aksi terkait dengan sumbernya. `request:completed` melaporkan `method`, `url`, `statusCode`, `durationMs`, dan `ip` opsional ketika alamatnya diketahui.
- **[SIEM](https://csrc.nist.gov/glossary/term/security_information_and_event_management) dan alerting real-time** ingin aliran untuk diserap. Satu `router.on()` meneruskan seluruh permukaan ke mana pun log atau alert pergi.

Field `type` menjaga kanal kesalahan tetap bersih. Lalu lintas klien normal bernilai `external`, sementara kesalahan framework, timeout 503 sintetis, atau context request yang hilang menandai event `internal`. Pipeline alert kesalahan menyaring `internal` untuk menangkap kesalahan framework tanpa tenggelam dalam request rutin, lalu menyertakan `process:failed` berdasarkan kind, karena kesalahan proses selalu menumpang kanal `external`:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routes: { directory: './routes' }
})
// ---cut---
router.on((event) => {
  // Teruskan kesalahan framework dan proses
  if (event.type === 'internal' || event.kind === 'process:failed') {
    console.log(JSON.stringify({ at: event.timestamp, ...event }))
  }
})
```

## Langkah Berikutnya

- [Referensi Event](/id/middleware/observability/events) - setiap jenis event dan metadata-nya.
- [Request Logging](/id/middleware/observability/logging) - ubah event menjadi access log terstruktur.
- [Pelaporan Error](/id/middleware/observability/errors) - catat kegagalan dan pasangkan dengan [penanganan error](/id/error-handling/object-details).
