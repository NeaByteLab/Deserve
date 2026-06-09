---
description: "Kenapa Deserve tidak punya opsi pretty JSON, karena pemformatan adalah tugas konsumen dan data di kabel tetap minified."
---

# Pretty JSON

Deserve tidak punya opsi pretty JSON, dan [`ctx.send.json()`](/id/response/json) selalu mengirim body minified. Indentasi adalah bantuan baca, dan membaca terjadi di sisi konsumen, bukan di kabel.

## Kenapa Tidak Dibawa

Sebuah fitur pretty JSON memberi indentasi pada body response, sering di balik query `?pretty`, supaya keluarannya lebih mudah dibaca mata. Biayanya jatuh ke setiap response. Spasi dan baris baru tambahan menambah byte yang dikirim dan kerja untuk menghasilkannya, dan payload besar membayar pajak itu pada tiap request demi kenyamanan yang tak pernah dirasakan server.

Pembaca sudah punya alat yang lebih baik. Sebuah browser, [`curl`](https://curl.se/) yang dialirkan ke [`jq`](https://jqlang.org/), Postman, dan setiap editor memformat JSON sesuai permintaan, jadi indentasi cuma satu ketukan jauhnya di mana pun data benar-benar dilihat. Mengirimnya sudah ter-indentasi dari server tidak memformat apa pun yang tak bisa diformat konsumen sendiri, sambil membebankan bandwidth untuk itu.

## Data di Kabel Tetap Minified

`ctx.send.json()` membangun response lewat [`Response.json`](https://developer.mozilla.org/en-US/docs/Web/API/Response/json_static) milik platform, yang menserialisasi tanpa indentasi. Body-nya ringkas secara default, tanpa apa pun untuk dimatikan.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Body ringkas, tanpa spasi tambahan
  return ctx.send.json({ id: 1, name: 'Alice' })
}
```

Ini berpasangan dengan [kompresi](/id/by-design/compress). Body minified sudah kecil, dan runtime mengompresinya lebih jauh, jadi byte di kabel tetap seramping yang data izinkan. Pretty printing akan mendorong ke arah sebaliknya, menggembungkan body tepat sebelum dikompresi.

## Ketika Keluaran Ter-indentasi Memang Diinginkan

Untuk kasus yang benar-benar butuh body ter-indentasi, seperti file yang diunduh dan dibuka manusia, pemformatannya eksplisit dan lokal alih-alih mode global. Bangun string dengan `JSON.stringify` dan kirim sebagai teks.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Indentasi sengaja untuk rute ini
  const body = JSON.stringify({ id: 1, name: 'Alice' }, null, 2)

  // Kirim sebagai teks, jaga tipe JSON
  return ctx.send.text(body, {
    headers: { 'Content-Type': 'application/json' }
  })
}
```

Indentasi adalah pilihan untuk satu response, bukan default yang dibawa seluruh API. Lihat [response teks](/id/response/text) untuk helper yang dipakai di sini dan [response JSON](/id/response/json) untuk default yang ringkas.
