---
description: "Kenapa Deserve tidak punya method override, karena setiap metode HTTP adalah rute kelas satu dan triknya adalah warisan lama."
---

# Method Override

Deserve tidak punya method override, dan tak satu pun diperlukan. Setiap metode HTTP adalah rute kelas satu, jadi tak ada verb yang dipalsukan.

## Untuk Apa Method Override Dulu

Method override adalah workaround lama, bukan fitur HTTP. Elemen [form HTML](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form#method) hanya pernah mengirim `GET` atau `POST`, padahal REST ingin `PUT`, `PATCH`, dan `DELETE`. Untuk menjembatani celah itu, sebuah form mengirim `POST` dengan field tersembunyi `_method`, atau klien menambah header `X-HTTP-Method-Override`, dan server menjalankan handler untuk verb yang dipalsukan.

Bentuk header punya kegunaan kedua, menyelinap melewati proxy korporat lama yang memblokir `PUT` atau `DELETE` mentah-mentah. Kedua trik menerowongkan metode asli di dalam `POST`.

Tak satu pun standar. [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110) mendefinisikan metode HTTP, dan method override tak ada di dalamnya. Header `X-HTTP-Method-Override` adalah konvensi vendor, paling dekat dengan catatan `X-HTTP-Method` di spesifikasi OData Microsoft, bukan aturan [WHATWG](https://fetch.spec.whatwg.org/) atau IETF.

## Kenapa Tidak Dibawa

Alasan trik itu ada sudah hilang. Klien modern mengirim metode apa pun langsung, jadi `fetch(url, { method: 'DELETE' })` mencapai handler `DELETE` tanpa apa pun untuk dibongkar. API dipanggil dari skrip, aplikasi mobile, dan klien HTTP sekarang, bukan form HTML mentah, dan proxy yang memblokir verb standar sudah langka.

Deserve juga merutekan pada `req.method` asli, yang tak bisa ditulis ulang handler di tengah request, sejalan dengan [bangun di atas platform](/id/core-concepts/philosophy#bangun-di-atas-platform). Itu menjaga metode tetap jujur dari edge ke handler. Sebuah middleware yang diam-diam menukar satu verb dengan lain akan menyembunyikan niat ketimbang melayaninya, jadi framework membiarkan metode sebagaimana dikirim klien.

## Setiap Metode Adalah Rute

Sebuah file rute mengekspor satu fungsi per metode, dan namanya adalah metodenya. Tak ada tabel untuk didaftarkan dan tak ada verb untuk diterjemahkan. Sebuah file seperti `items/[id].ts` membaca `id`-nya dari path lewat [`ctx.param`](/id/core-concepts/context-object#akses-data-request).

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
// Baca satu item lewat id
export function GET(ctx: Context): Response {
  return ctx.send.json({
    id: ctx.param('id')
  })
}

// Ganti item-nya
export function PUT(ctx: Context): Response {
  return ctx.send.json({
    updated: true
  })
}

// Hapus item-nya
export function DELETE(ctx: Context): Response {
  return ctx.send.json({
    deleted: true
  })
}
```

Klien menargetkan masing-masing dengan mengirim metode yang cocok. Lihat [file-based routing](/id/core-concepts/file-based-routing) untuk cara sebuah file memetakan ke rute.

```typescript twoslash
// Tiap panggilan mengenai handler-nya sendiri
await fetch(
  '/items/42',
  {
    method: 'PUT'
  }
)
await fetch(
  '/items/42',
  {
    method: 'DELETE'
  }
)
```

Membangun stateless atau stateful adalah gerakan yang sama, tinggal tambahkan filenya. Sebuah endpoint REST stateless adalah handler yang membaca request dan membalas, sementara alur stateful menambah [middleware session](/id/middleware/session) dan membaca data per-pengguna dari [`ctx.state`](/id/core-concepts/context-object#berbagi-state). Metodenya tetap asli di kedua jalur, tanpa apa pun untuk disamarkan saat masuk.

Sebuah API REST atau RESTful penuh muncul dari sini tanpa konfigurasi tambahan. Verb-nya sudah sejajar dengan aksinya, `GET` untuk membaca, `POST` untuk membuat, `PUT` dan `PATCH` untuk memperbarui, `DELETE` untuk menghapus, jadi sebuah resource hanyalah file rute dengan handler itu. Perilakunya terbaca sama di setiap endpoint, yang membuat seluruh API terasa mulus.

## Yang Sudah Ditangani Deserve

Perilaku sadar-metode yang dulu dibutuhkan override sudah tertanam:

- **Metode yang didukung** - `DELETE`, `GET`, `HEAD`, `OPTIONS`, `PATCH`, `POST`, dan `PUT` masing-masing memetakan ke handler yang diekspor.
- **HEAD otomatis** - sebuah rute dengan `GET` menjawab `HEAD` juga, mengembalikan header tanpa body.
- **Header Allow** - sebuah request dengan metode yang tak ditangani mendapat `405` membawa header [`Allow`](https://www.rfc-editor.org/rfc/rfc9110#name-allow) yang mendaftar metode yang didukung rute.

Jadi sebuah `405` sudah memberi tahu klien verb mana yang asli, yang merupakan versi jujur dari apa yang coba ditutupi override.

## Ketika Form Asli Butuh Metode Lain

Sebuah form HTML polos tetap hanya posting `GET` atau `POST`. Jalur bersihnya adalah mengirim request dengan `fetch` dari skrip kecil, memilih metode langsung, ketimbang menerowongkannya lewat field tersembunyi. Untuk deployment yang benar-benar tak bisa mengubah klien, penulisan ulang itu cocok di proxy di depan aplikasi, bukan di dalam handler, yang menjaga Deserve merutekan pada metode yang benar-benar diterimanya.
