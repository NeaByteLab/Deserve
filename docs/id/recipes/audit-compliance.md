---
description: 'Ubah observability bus Deserve menjadi jejak audit tingkat kepatuhan, lalu alirkan ke store milik sendiri, sebuah SIEM, atau sebuah WAF.'
---

# Audit Kepatuhan

Kerja kepatuhan mengajukan satu pertanyaan sulit ke setiap server: apa yang terjadi, kapan, dan bisakah dibuktikan nanti. Deserve menjawabnya di sumber. Setiap kesalahan subsistem, setiap request yang selesai, dan setiap terminasi diri yang diblokir tiba di satu [observability bus](/id/middleware/observability/overview), terstruktur dan bercap waktu pada saat ia menyala.

Pembingkaian ini penting, jadi layak dinyatakan terang. Deserve bukan [SIEM](https://csrc.nist.gov/glossary/term/security_information_and_event_management) dan tidak lebih tahan lama dari satu SIEM. Yang ia berikan adalah *input* SIEM paling rapi yang bisa diserahkan sebuah framework. Data yang meninggalkan bus lebih bersih dan lebih lengkap dari yang dipancarkan kebanyakan framework, karena ia membawa perilaku framework dan kesalahan aplikasi sekaligus, masing-masing di [kanal internal atau external](/id/middleware/observability/events) yang bersih sehingga jalur alert tidak pernah tenggelam dalam lalu lintas rutin. Penyimpanan tahan lama tetap tanggung jawab operator, tapi yang sampai ke penyimpanan itu berangkat jujur.

## Apa yang Sudah Ditangkap Bus

Satu listener [`router.on()`](/id/middleware/observability/overview) melihat seluruh permukaan, dan setiap event berbagi amplop `{ type, kind, metadata, timestamp }` yang sama. Jenis yang paling penting untuk jejak audit memetakan langsung ke hal yang diminta auditor:

| Kebutuhan kepatuhan          | Event yang menjawabnya                                                             |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| Siapa melakukan apa, kapan   | [`request:completed`](/id/middleware/observability/events#request) dengan `method`, `url`, `statusCode`, `durationMs`, dan `ip` opsional |
| Event relevan-keamanan       | [`session:invalid`](/id/middleware/observability/events#middleware-keamanan), [`csrf:failed`](/id/middleware/observability/events#middleware-keamanan), [`process:failed`](/id/middleware/observability/events#process) |
| Kegagalan dan kesalahan      | [`request:failed`](/id/middleware/observability/events#request), [`worker:crashed`](/id/middleware/observability/events#worker), [`view:failed`](/id/middleware/observability/events#view) |
| Garis waktu yang dapat disusun | Setiap event membawa `timestamp` dalam milidetik epoch dan tiba terurut            |

Tidak ada yang perlu dikabelkan di dalam handler. Kesalahan menyala sendiri, itulah sebabnya cookie yang dirusak atau `Deno.exit` yang diblokir muncul tanpa satu baris logging pun di rute. Daftar lengkapnya ada di [Referensi Event](/id/middleware/observability/events).

## Listener Tingkat Kepatuhan

Listener audit punya satu tugas: menangkap setiap event sebagai rekaman terstruktur dan menyerahkannya ke penyimpanan tahan lama. Menyaring berdasarkan `type` menjaga kesalahan framework di jalurnya sendiri sambil tetap merekam lalu lintas normal:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routes: { directory: './routes' }
})

// Satu rekaman audit per event
router.on((event) => {
  const record = JSON.stringify({
    at: event.timestamp,
    channel: event.type,
    kind: event.kind,
    ...event.metadata
  })
  // Event internal memberi makan kanal kesalahan
  if (event.type === 'internal') {
    console.error(record)
  } else {
    console.log(record)
  }
})

await router.serve(8000)
```

Tiap rekaman sudah JSON, sudah bercap waktu, dan sudah berlabel `channel`. Itu bentuk yang diharapkan setiap hilir di bawah, jadi listener yang sama memberi makan ketiga opsi tanpa perubahan.

## Opsi 1 - Bangun Store Sendiri

Sink tahan lama paling sederhana adalah yang dimiliki dari ujung ke ujung. Tambahkan tiap rekaman ke berkas tulis-saja, kirim ke object storage, atau sisipkan ke database. Sebuah penambah berkas menjaga log audit di disk dan di luar jalur request:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routes: { directory: './routes' }
})
// ---cut---
// Buka log audit sekali, tambah-saja
const audit = await Deno.open('./audit.log', {
  create: true,
  append: true
})
const encoder = new TextEncoder()

router.on(async (event) => {
  const record = JSON.stringify({
    at: event.timestamp,
    ...event
  })
  // Tambah satu baris per event
  await audit.write(encoder.encode(record + '\n'))
})
```

Menulis ke disk butuh flag `--allow-write` yang dibatasi ke log, seperti dibahas di [Production Deploy](/id/recipes/production-deploy#mengunci-permission). Untuk retensi jangka panjang, kirim rekaman yang sama ke object storage tahan lama dengan pola di [Object Storage](/id/recipes/object-storage).

## Opsi 2 - Alirkan ke SIEM

Sebuah [SIEM](https://csrc.nist.gov/glossary/term/security_information_and_event_management) mengumpulkan event dari banyak sistem, mengorelasikannya, dan memunculkan alert. Kebanyakan menerima rekaman terstruktur lewat endpoint HTTP biasa, jadi listener audit meneruskan tiap rekaman dengan satu `fetch`:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routes: { directory: './routes' }
})
// ---cut---
const endpoint = 'https://http-inputs-acme.splunkcloud.com/services/collector/event'
const token = Deno.env.get('SIEM_TOKEN') ?? ''

router.on((event) => {
  // Teruskan rekaman ke SIEM
  void fetch(endpoint, {
    method: 'POST',
    headers: {
      authorization: `Splunk ${token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      event: {
        ...event.metadata,
        kind: event.kind
      }
    })
  })
})
```

Endpoint dan bentuk auth mengikuti vendor. Kolektor umum dengan API ingest HTTP publik mencakup [Splunk HTTP Event Collector](https://docs.splunk.com/Documentation/Splunk/latest/Data/UsetheHTTPEventCollector), [Datadog Logs Intake](https://docs.datadoghq.com/api/latest/logs/), [Elasticsearch Bulk API](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-bulk), dan endpoint [OpenTelemetry OTLP/HTTP](https://opentelemetry.io/docs/specs/otel/protocol/exporter/) mana pun. `fetch` keluar butuh flag `--allow-net` dari [Production Deploy](/id/recipes/production-deploy#daftar-periksa-permission), dan panggilannya ditembakkan tanpa `await` supaya jalur request tetap cepat.

## Opsi 3 - Beri Makan Loop Keputusan WAF

Sebuah [Web Application Firewall](https://owasp.org/www-community/Web_Application_Firewall) memblokir lalu lintas buruk sebelum sampai ke aplikasi, dan bus memberinya sinyal untuk bertindak. Lonjakan event `request:failed` dari satu `ip`, atau kesalahan `csrf:failed` berulang, persis pola yang diincar aturan WAF. Teruskan jenis yang relevan-keamanan ke API firewall untuk menggerakkan daftar blokir:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routes: { directory: './routes' }
})
// ---cut---
router.on((event) => {
  // Hanya teruskan kesalahan relevan-keamanan
  if (event.kind === 'csrf:failed' || event.kind === 'request:failed') {
    void fetch('https://waf.internal/signals', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        at: event.timestamp,
        ...event.metadata
      })
    })
  }
})
```

Firewall terkelola membukanya lewat API masing-masing, seperti [aturan kustom WAF Cloudflare](https://developers.cloudflare.com/waf/custom-rules/) atau [API AWS WAF](https://docs.aws.amazon.com/waf/latest/APIReference/Welcome.html). Bus memasok bukti, WAF memegang putusan, dan keduanya tetap terpisah bersih.

## Batas yang Jujur

Menjaga klaim tetap lurus membuat resep ini tepercaya:

- **Tidak tahan lama sendirian.** Tanpa listener terdaftar, emit jadi no-op, jadi kesalahan sebelum penyimpanan dikabelkan memang tidak terekam. Ketahanan tinggal di sink, bukan di bus.
- **Upaya terbaik, dalam proses.** Event menyala real time di server, jadi crash keras antara emit dan tulis bisa menjatuhkan rekaman terakhir. [Process guard](/id/error-handling/defense-in-depth#lapis-5-process-guard) menjaga proses tetap hidup melewati sebagian besar kesalahan, yang mempersempit jendela itu tapi tidak menutupnya.
- **Input, bukan analisis.** Bus menghasilkan rekaman bersih. Korelasi, retensi, dan alerting milik store, SIEM, atau WAF yang menerimanya.

Yang dijamin Deserve adalah bagian yang biasanya gagal dibuat framework: data yang sampai ke penyimpanan itu terstruktur, bercap waktu di sumber, terpisah per kanal, dan lengkap di seluruh perilaku framework dan kesalahan aplikasi. Semua dapat diaudit karena semua memancar.
