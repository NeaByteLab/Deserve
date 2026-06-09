---
description: "Kenapa Deserve tidak punya middleware locale redirect, karena membaca Accept-Language dan redirect cuma beberapa baris di rute."
---

# Locale Redirect

Deserve tidak punya middleware locale redirect. Memilih bahasa dari request dan mengirim pengunjung ke path yang cocok adalah pembacaan singkat satu header diikuti [redirect](/id/response/redirect), jadi ia tinggal di rute yang memiliki keputusan itu.

## Kenapa Tidak Dibawa

Sebuah locale redirect memeriksa bahasa pilihan pengunjung dan meneruskan path telanjang seperti `/` ke yang terlokalisasi seperti `/en` atau `/id`. Framework sering membawa ini sebagai middleware yang berjalan di setiap request, yang berarti satu aturan untuk seluruh aplikasi dan redirect pada path yang mungkin tak membutuhkannya.

Pilihan bahasa adalah keputusan produk, bukan aturan transport. Locale mana yang ada, apa default-nya, dan apakah cookie menimpa petunjuk browser semuanya berbeda per aplikasi. Membiarkannya di rute menjaga keputusan itu terlihat dan mudah diubah, sejalan dengan [bangun di atas platform](/id/core-concepts/philosophy#bangun-di-atas-platform).

## Membaca Preferensi

Browser mengirim daftar bahasanya di header [`Accept-Language`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Language), dibaca lewat [`ctx.header`](/id/core-concepts/context-object#akses-data-request). Sebuah pencocokan kecil terhadap locale yang didukung aplikasi memberi targetnya, lalu [`ctx.send.redirect`](/id/response/redirect) mengirim pengunjung ke sana.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Baca petunjuk bahasa browser
  const header = ctx.header('accept-language') ?? ''
  const supported = ['en', 'id']

  // Cocokkan locale didukung atau default
  const preferred = header.split(',')[0]?.slice(0, 2) ?? 'en'
  const locale = supported.includes(preferred) ? preferred : 'en'

  // Kirim ke path terlokalisasi
  return ctx.send.redirect(`/${locale}`, 302)
}
```

Sebuah 302 menjaga redirect tetap sementara, jadi kunjungan berikutnya tetap bisa dicocokkan lagi. Untuk perpindahan tetap yang patut di-cache, [`ctx.send.redirect`](/id/response/redirect) menerima 301 dan status standar lainnya.

## Berbagi Pilihan dengan Rute Berikutnya

Ketika beberapa rute butuh locale yang diresolusi, middleware bisa meresolusinya sekali dan menyimpannya di [`ctx.state`](/id/core-concepts/context-object#berbagi-state) alih-alih redirect, jadi tiap handler membaca nilai yang sama.

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
router.use(async (ctx, next) => {
  // Resolusi locale sekali per request
  const header = ctx.header('accept-language') ?? ''
  const preferred = header.split(',')[0]?.slice(0, 2) ?? 'en'

  // Bagikan ke route handler
  ctx.state.locale = ['en', 'id'].includes(preferred) ? preferred : 'en'
  return await next()
})

await router.serve(8000)
```

Bentuk redirect mengirim pengunjung ke URL terlokalisasi, sementara bentuk state menjaga satu URL dan mengoper locale ke dalam. Keduanya tinggal di file rute polos, jadi aturannya ada di mana bahasa penting dan tak di tempat lain.
