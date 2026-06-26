---
description: "Kenapa Deserve tidak membawa OpenTelemetry SDK, dan cara event-nya yang selaras OTel bisa menyuplai backend tracing apa pun."
---

# Distributed Tracing

Deserve tidak membawa OpenTelemetry SDK, tidak ada pembuatan span otomatis, dan tidak ada propagasi konteks trace. Batas itu digambar dengan sengaja.

## Kenapa Tidak Dibawa

Sebuah tracing SDK adalah dependensi berat dan beropini. SDK itu mengunci versi exporter, memiliki kebijakan sampling, dan memutuskan bagaimana pohon span dibentuk. Membundelnya akan melanggar [tanpa dependensi](/id/core-concepts/zero-dependency) dan memaksa satu vendor pada setiap proyek, padahal setiap tim sudah menjalankan backend berbeda. Satu mengirim ke [Grafana Tempo](https://grafana.com/oss/tempo/), lain ke [Jaeger](https://www.jaegertracing.io/), lain ke vendor terkelola, lain ke kolektor buatan sendiri.

Jadi keputusannya adalah berhenti di data, bukan di transport. Deserve memancarkan siklus hidup request lengkap lewat [event observability](/id/middleware/observability/overview), dan setiap event sudah membawa field yang dinamai mengikuti konvensi semantik OpenTelemetry. Event-nya adalah sumber kebenaran, dan meneruskannya ke backend tracing adalah langganan singkat yang dimiliki developer.

## Yang Dibawa, dan Yang Tidak

Ketiga ini duduk di luar framework dengan sengaja:

- **Auto-instrumentasi** - Deserve tidak membungkus library atau membuka span untuk panggilan keluar. Tiap request memancarkan satu event selesai, dan sebuah span dibangun darinya di listener.
- **Propagasi konteks trace** - tak ada header `traceparent` yang dibaca atau ditulis. Sebuah handler yang butuh konteks terdistribusi membaca header lewat [`ctx.get.header('traceparent')`](/id/core-concepts/context-object#ctx-get-header-key) dan meneruskannya.
- **Hierarki span** - event-nya datar, satu per request, bukan pohon induk-anak. Span bersarang dirakit di backend, atau di listener, dari data yang disediakan event.

Yang memang dibawa adalah data yang dibutuhkan sebuah span, sudah dikumpulkan dan dinamai agar cocok.

## Datanya Sudah Ada

Setiap request memancarkan `request:completed`, dan sebuah request dengan status `400` atau lebih tinggi juga memancarkan `request:failed`. Keduanya membawa amplop yang sama, dan metadata-nya adalah kebenaran tempat sebuah span dibangun:

- **`timestamp`** - waktu pembuatan event dalam milidetik epoch, jangkar mulai span.
- **`durationMs`** - durasi request terukur, panjang span.
- **`ip`** - IP klien yang diresolusi, menghormati [`trustProxy`](/id/getting-started/server-configuration#resolusi-ip-klien).
- **`method`**, **`statusCode`**, **`url`** - atribut request inti.
- **Metrik selaras OTel** - `route`, `serverAddress`, `serverPort`, `userAgent`, `requestSize`, `responseSize`, diteruskan hanya ketika diketahui.

Nama field mengikuti konvensi semantik OpenTelemetry, jadi pemetaan ke atribut span hampir sekadar penggantian nama. Daftar lengkapnya ada di [Referensi Event](/id/middleware/observability/events#request).

## Membangun Span dari Sebuah Event

Listener ini mengubah tiap request selesai jadi rekaman berbentuk span dan menyerahkannya ke exporter. Ganti panggilan `exportSpan` dengan klien backend apa pun.

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routes: { directory: './routes' }
})
declare function exportSpan(span: Record<string, unknown>): void
// ---cut---
router.on((event) => {
  // Bangun span dari tiap request selesai
  if (event.kind === 'request:completed') {
    const m = event.metadata as {
      method: string
      url: string
      statusCode: number
      durationMs: number
      route?: string
      serverAddress?: string
      serverPort?: number
      userAgent?: string
    }
    exportSpan({
      name: `${m.method} ${m.route ?? m.url}`,
      startTimeUnixMs: event.timestamp,
      durationMs: m.durationMs,
      attributes: {
        'http.request.method': m.method,
        'http.response.status_code': m.statusCode,
        'url.full': m.url,
        'http.route': m.route,
        'server.address': m.serverAddress,
        'server.port': m.serverPort,
        'user_agent.original': m.userAgent
      }
    })
  }
})

await router.serve(8000)
```

Kunci atribut di atas adalah nama span HTTP OpenTelemetry, jadi rekaman itu masuk langsung ke pipeline tracing.

## Melanjutkan Trace yang Masuk

Distributed tracing menghubungkan span lintas layanan lewat header `traceparent`. Deserve tidak menguraikannya, jadi sebuah handler yang bergabung ke trace yang ada membaca header dari [Context](/id/core-concepts/context-object#ctx-get-header-key) dan membawanya maju.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export async function GET(ctx: Context): Promise<Response> {
  // Baca konteks trace hulu bila ada
  const traceparent = ctx.get.header('traceparent')

  // Teruskan pada panggilan keluar
  const upstream = await fetch('https://api.internal/data', {
    headers: traceparent ? { traceparent } : {}
  })

  return ctx.send.json(await upstream.json())
}
```

Untuk span ID yang harus hidup lintas middleware dan handler, [session](/id/middleware/session) bertanda tangan membawanya ketika satu listener membuka span lebih awal dan lain membacanya balik.

## Ke Mana Datanya Pergi

Listener adalah satu-satunya sambungan, jadi tujuannya adalah pilihan, bukan batasan. Grafana, Jaeger, vendor terkelola, atau kolektor buatan sendiri semuanya menerima rekaman span yang sama. Pasangkan ini dengan [Request Logging](/id/middleware/observability/logging) untuk log akses dan [Pelaporan Error](/id/middleware/observability/errors) untuk kegagalan, semuanya dari satu [event bus](/id/middleware/observability/overview).
