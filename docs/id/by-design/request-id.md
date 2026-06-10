---
description: "Kenapa Deserve tidak punya middleware request ID, karena IP klien yang diresolusi adalah identitas tepercaya dan ID acak bukan."
---

# Request ID

Deserve tidak punya middleware request ID, dan alasannya soal kepercayaan. Sebuah ID yang dihasilkan tak mengidentifikasi apa pun, jadi framework bersandar pada identitas yang benar-benar bisa dihitungnya, IP klien yang diresolusi.

## Kenapa Tidak Dibawa

Sebuah middleware request ID mencap tiap request dengan nilai segar, biasanya dari `crypto.randomUUID()`. Tangkapannya adalah apa arti nilai itu. Sebuah ID yang dihasilkan server itu acak, jadi ia mengikat balik ke tak seorang pun dan tak membawa fakta tentang pemanggil. Sebuah `X-Request-ID` yang dipasok klien lebih buruk, karena klien bisa mengirim apa saja, mengulang nilai, atau mengaturnya ke `0xb33F....`, dan mempercayai itu sebagai identitas adalah mempercayai header yang ditulis orang asing.

Jadi ID acak baik sebagai label log tapi salah sebagai sumber kebenaran. Deserve sudah mengawasi semua dari saat server menyala sampai saat sebuah request mencapai pengguna, lewat [event siklus hidup](/id/middleware/observability/overview), jadi sebuah ID sintetis terpisah seperti `0xb33F....` hanya mengulang yang sudah dilacak framework. Identitas yang bisa diandalkannya adalah yang layak dipakai.

## IP Adalah Sumber Kebenaran

Setiap request membawa [`ctx.ip`](/id/core-concepts/context-object#ip-klien), alamat klien yang diresolusi. Nilai itu tak dibaca mentah dari header. Framework menelusuri rantai forwarding lewat hop tepercaya dan berhenti di hop pertama yang tak dipercayainya, jadi header palsu dari peer tak tepercaya tak pernah menang.

- **Tanpa proxy tepercaya** - `ctx.ip` adalah peer TCP langsung, dan header forwarding diabaikan sepenuhnya.
- **Di belakang proxy tepercaya** - rantai ditelusuri kanan ke kiri lewat hop tepercaya, menghormati [`X-Forwarded-For`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-For), header `Forwarded` [RFC 7239](https://www.rfc-editor.org/rfc/rfc7239), dan header IP-tunggal seperti `cf-connecting-ip`.
- **Dikonfigurasi sekali** - [`trustProxy`](/id/getting-started/server-configuration#resolusi-ip-klien) memutuskan peer mana yang dianggap tepercaya, jadi mempercayainya adalah pilihan sengaja, bukan default.

Mempercayai sebuah proxy sepenuhnya benar hanya karena konfigurasinya berkata begitu. Sebuah framework yang menebak akan menangkap alamat yang salah, jadi Deserve membuat kepercayaan itu eksplisit dan menghitung sisanya.

## Satu Request Tak Pernah Tumpang Tindih

Setiap request mendapat [Context](/id/core-concepts/context-object)-nya sendiri, dibangun sekali saat request tiba dan hilang saat response dikirim. Tak ada request diproses dua kali, dan tak ada dua request berbagi state atau saling divalidasi. Sebuah ID sintetis untuk membedakan request menyelesaikan masalah yang tak ada, karena siklus hidup sudah menjaganya terpisah.

## Mengkorelasi Tanpa ID Acak

Untuk mengkorelasi log, [event siklus hidup](/id/middleware/observability/overview) sudah membawa apa yang dimaksudkan request ID. Setiap event `request:complete` menyertakan `ip` yang diresolusi, `url`, dan `durationMs` di metadata-nya, plus `timestamp` di amplopnya, jadi sebuah baris log mengidentifikasi request dari nilai asli ketimbang yang dibuat-buat.

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routesDir: './routes'
})
// ---cut---
router.on((event) => {
  // Korelasi dengan IP dan waktu asli
  if (event.kind === 'request:complete') {
    const { ip, url } = event.metadata as { ip?: string, url: string }
    console.log(`${event.timestamp} ${ip ?? 'unknown'} ${url}`)
  }
})

await router.serve(8000)
```

## Ketika Sebuah Label Memang Membantu

Sebuah label berumur pendek untuk mengikat baris log dalam satu request tetap mungkin, dan label itu tinggal di [`ctx.state`](/id/core-concepts/context-object#berbagi-state) seperti nilai per-request lain. Intinya memperlakukannya sebagai kemudahan, bukan identitas, karena jawaban tepercaya adalah `ctx.ip`.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
router.use(async (ctx, next) => {
  // Label untuk log, bukan kepercayaan
  ctx.state.label = crypto.randomUUID()
  return await next()
})
```

Untuk konteks trace yang melintasi layanan, alat yang tepat adalah header `traceparent` yang dibahas di [Distributed Tracing](/id/by-design/tracing#melanjutkan-trace-yang-masuk), bukan nilai per-request acak.
