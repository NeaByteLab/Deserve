---
description: "Kenapa Deserve tidak punya middleware kompresi, karena Deno mengompresi response dan proxy menangani sisanya."
---

# Kompresi

Deserve tidak membawa middleware kompresi, dan celah itu sudah terisi dua kali sebelum sebuah request menyentuh kode aplikasi.

## Kenapa Tidak Dibawa

Kompresi adalah urusan lapisan di sekitar handler, bukan di dalamnya. Runtime melakukannya saat keluar, dan di produksi sebuah proxy biasanya sudah melakukannya lebih dulu. Sebuah middleware yang mengulang pekerjaan yang sama hanya menambah biaya dan peluang bentrok dengan encoding yang sudah diatur lapisan itu.

Dua lapisan sudah menanganinya:

- **Runtime** - [`Deno.serve`](/id/getting-started/server-configuration) mengompresi body response sendiri, sejalan dengan [bangun di atas platform](/id/core-concepts/philosophy#bangun-di-atas-platform).
- **Network edge** - kebanyakan aplikasi produksi berada di belakang proxy seperti [Cloudflare](https://developers.cloudflare.com/speed/optimization/content/compression/) atau [nginx](https://docs.nginx.com/nginx/admin-guide/web-server/compression/), di mana kompresi adalah tugas lapisan jaringan, bukan aplikasi.

Jadi middleware kompresi baru berguna hanya di localhost polos tanpa proxy di depan, dan bahkan di sana runtime sudah menanganinya.

## Yang Deno Lakukan Sendiri

`Deno.serve` membaca header `Accept-Encoding` dari request dan mengompresi body response ketika hal ini berlaku:

- Header mengiklankan `br` untuk Brotli atau `gzip`, dan preferensi nilai kualitas dihormati.
- `Content-Type` response termasuk salah satu tipe yang bisa dikompresi.
- Body response lebih besar dari 64 byte.

Ketika mengompresi, runtime mengatur `Content-Encoding` ke skema yang dipilih dan menyesuaikan header `Vary` supaya cache memakai encoding sebagai kunci. Tidak ada di handler yang perlu meminta ini.

Sebuah response dibiarkan tanpa kompresi ketika salah satu dari ini hadir, yang menandakan runtime sengaja mundur:

- Header `Content-Encoding`, berarti body sudah ter-encode.
- Header `Content-Range`, berarti ada request rentang.
- Header `Cache-Control: no-transform`, berarti tak ada lapisan yang boleh menulis ulang body.

## Membiarkan Runtime Mengompresi

Jalur default adalah mengirim response biasa dan membiarkan encoding apa adanya. Body JSON atau teks polos mengalir lewat, dan runtime mengompresinya ketika klien mendukung.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Kirim polos, runtime kompresi bila bisa
  return ctx.send.json({
    message: 'compressed by the runtime'
  })
}
```

## Mengecualikan Satu Response

Untuk menjaga satu response tetap tanpa kompresi, atur header yang diperlakukan runtime sebagai sinyal berhenti. Sebuah `Cache-Control: no-transform` memberi tahu runtime dan proxy hilir untuk tidak menyentuh body.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Larang lapisan apa pun menulis ulang body
  ctx.set.header('Cache-Control', 'no-transform')
  return ctx.send.json({
    message: 'sent verbatim'
  })
}
```

Mengatur header lewat [`ctx.set.header`](/id/core-concepts/context-object#ctx-set-header-key-value) adalah jalur yang sama dipakai di tempat lain, jadi opt-out ini terbaca seperti header lain.

## Body yang Sudah Ter-encode

Body yang datang sudah terkompresi, seperti aset `.gz` tersimpan, membawa `Content-Encoding`-nya sendiri. Runtime melihat header itu dan melewati kompresi ulang, jadi byte dikirim apa adanya. Untuk file di disk ini ditangani oleh [penyajian statis](/id/static-file/basic), yang mengatur tipe dan membiarkan runtime memutuskan.

## Di Belakang Proxy

Di deployment yang difrontkan Cloudflare atau nginx, proxy menegosiasikan kompresi dengan klien di edge, sering sebelum request mencapai origin. Origin tetap bisa mengirim response biasa, dan lapisan-lapisan sepakat soal encoding lewat header `Accept-Encoding` dan `Vary`. Aplikasi tetap di luar urusan ini, yang memang intinya.
