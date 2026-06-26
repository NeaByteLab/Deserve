---
description: "Bangun kontrak request dengan Validator.define, sebuah transform yang dipasangkan dengan guard untuk menolak input buruk."
---

# Define Schema

> **Referensi**: [Repositori GitHub Typebox](https://github.com/NeaByteLab/Typebox)

Sebuah kontrak adalah fungsi yang menerima satu input dan mengembalikan nilai yang sudah bersih. `Validator.define` membangunnya dari dua bagian, sebuah transform yang membentuk output dan guard opsional yang menolak input sebelum transform berjalan.

## Bentuk Kontrak

`Validator.define(transform, guard?)` mengembalikan sebuah kontrak:

```typescript twoslash
import { Validator } from '@neabyte/deserve'

// Hanya transform, tanpa guard
const Trim = Validator.define((body: { name: string }) => ({
  name: body.name.trim()
}))
```

Transform menormalkan nilai, memangkas string, membuat email jadi huruf kecil, atau memaksa angka. Transform berjalan sebagai badan kontrak setelah input dipercaya.

Transform juga memiliki bentuk output. Guard yang lolos tidak membuang key tambahan, jadi field tak dikenal dari client tetap ada kecuali transform menghilangkannya. Mengembalikan object baru hanya dengan field yang diinginkan menjaga input kejutan keluar dari data tervalidasi:

```typescript twoslash
import { Validator } from '@neabyte/deserve'

// Output hanya menyimpan field yang disebut
const NewUser = Validator.define((body: { name: string; role: string }) => ({
  name: body.name.trim()
}))
```

Di sini client yang mengirim `role: 'admin'` mendapati nilainya dibuang, karena transform tidak pernah menyalinnya.

## Urutan Operasi

Sebuah kontrak dengan setidaknya satu guard menjalankan empat langkah dalam urutan tetap, dan transform hanya pernah melihat input yang sudah lolos setiap guard:

1. Input string yang lebih panjang dari 10000 karakter ditolak sebelum hal lain.
2. Input object dibekukan dalam (deep frozen) agar guard tidak bisa memutasinya.
3. Setiap guard berjalan berurutan, melempar pada kegagalan pertama.
4. Transform berjalan dan mengembalikan nilai yang sudah bersih.

Kontrak yang dibangun tanpa guard berbentuk sepenuhnya berbeda. `Validator.define(transform)` mengembalikan transform apa adanya, jadi batas string dan pembekuan tidak pernah berjalan dan input mentah langsung mencapai transform. Transform tanpa guard harus memercayai inputnya atau melakukan pemeriksaan sendiri.

![Urutan operasi Define: sebuah kontrak ber-guard pertama membatasi input string pada 10000 karakter, lalu membekukan dalam sebuah object agar guard tidak bisa memutasinya, lalu menjalankan tiap guard berurutan dengan melempar pada kegagalan pertama, dan baru kemudian menjalankan transform pada input yang sudah lolos setiap guard, sementara kontrak tanpa guard mengembalikan transform apa adanya jadi batas maupun pembekuan tidak berjalan](/diagrams/validation-contract-order.png)

## Guard Menentukan Lolos Atau Gagal

Sebuah guard memeriksa input mentah dan mengembalikan keputusan:

- `true` saat input lolos.
- Sebuah `string` untuk satu alasan kegagalan.
- Sebuah `string[]` untuk beberapa alasan kegagalan sekaligus.

![Keputusan guard: mengembalikan true mengirim input ke transform, sementara mengembalikan sebuah string atau array string membuat kontrak melempar dan menjadi 422 dengan alasan itu terjaga di error.cause](/diagrams/validation-guard-verdict.png)

```typescript twoslash
import { Validator } from '@neabyte/deserve'

// Guard menolak nama kosong
const NewUser = Validator.define(
  (body: { name: string }) => ({ name: body.name.trim() }),
  (body) => (body.name.trim().length > 0 ? true : 'name must not be empty')
)
```

Guard yang mengembalikan alasan membuat kontrak melempar, dan validator mengubah lemparan itu menjadi 422 yang membawa alasan persis tersebut. Jalur dari sebuah alasan menuju respons ada di [Membaca Data Tervalidasi](/id/middleware/validation/reading-data#cara-kegagalan-muncul).

## Memeriksa Bentuk Lebih Dulu

Sebuah guard menerima input mentah, yang bisa `null`, sebuah array, atau nilai JSON apa pun yang dikirim client. Mengambil sebuah field pada bentuk yang salah akan melempar di dalam guard sebelum aturannya berjalan, jadi pemeriksaan bentuk datang lebih dulu:

```typescript twoslash
import { Validator } from '@neabyte/deserve'

// Pastikan object sebelum membaca field
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

const NewUser = Validator.define(
  (body: { name: string }) => ({ name: body.name.trim() }),
  (body) => {
    if (!isRecord(body)) {
      return 'body must be a JSON object'
    }
    return typeof body['name'] === 'string' ? true : 'name must be a string'
  }
)
```

Lemparan di dalam guard tetap menjadi 422, tidak pernah 500, jadi pemeriksaan bentuk yang terlewat gagal dengan aman alih-alih menjatuhkan request.

## Melaporkan Beberapa Field Sekaligus

Mengembalikan sebuah array melaporkan setiap field yang rusak dalam satu respons alih-alih satu per satu:

```typescript twoslash
import { Validator } from '@neabyte/deserve'

// Kumpulkan tiap kegagalan ke satu array
const NewUser = Validator.define(
  (body: { name: string; age: number }) => body,
  (body) => {
    const reasons: string[] = []
    if (body.name.trim().length === 0) {
      reasons.push('name must not be empty')
    }
    if (body.age < 18) {
      reasons.push('age must be at least 18')
    }
    return reasons.length === 0 ? true : reasons
  }
)
```

## Menyusun Beberapa Guard

Argumen kedua juga menerima array guard. Guard berjalan berurutan dan kontrak melempar pada yang pertama gagal, jadi guard berikutnya tidak pernah melihat input yang sudah ditolak guard sebelumnya:

```typescript twoslash
import { Validator } from '@neabyte/deserve'

// Cek bentuk dulu, aturan bisnis kedua
function hasFields(body: { from: string; to: string }): true | string {
  return body.from && body.to ? true : 'from and to are required'
}

function distinctAccounts(body: { from: string; to: string }): true | string {
  return body.from !== body.to ? true : 'from and to must differ'
}

const Transfer = Validator.define(
  (body: { from: string; to: string }) => body,
  [hasFields, distinctAccounts]
)
```

Memisahkan pemeriksaan bentuk dari aturan bisnis menjaga tiap guard tetap kecil dan membuat aturan lintas-field bisa berasumsi field-nya sudah ada.

## Pengaman Bawaan

Batas string dan pembekuan dari [Urutan Operasi](#urutan-operasi) berjalan sebagai bagian dari langkah guard, jadi sebuah kontrak ber-guard tidak pernah membuang waktu pada string raksasa dan sebuah guard tidak pernah memutasi nilai yang diperiksanya. Satu aturan lagi menjaga model waktunya:

- Guard async ditolak, karena validasi tetap sinkron dan dapat diprediksi.

Aturan ini berasal dari Typebox sendiri dan melindungi setiap kontrak yang membawa guard, baik yang berjalan lewat [Middleware Validator](/id/middleware/validation/validator-middleware) maupun panggilan kontrak langsung di sebuah handler. Transform tanpa guard memilih keluar dari ketiganya, jadi kontrak yang menangani input tak tepercaya sebaiknya selalu membawa setidaknya satu guard.

## Langkah Berikutnya

- [Middleware Validator](/id/middleware/validation/validator-middleware) - menghubungkan kontrak ke sumber request.
- [Membaca Data Tervalidasi](/id/middleware/validation/reading-data) - membaca output transform di handler.
- [Pola Lanjutan](/id/middleware/validation/advanced-patterns) - menyusun guard dan mengatur urutan kegagalannya.
- [Ringkasan Validasi](/id/middleware/validation/overview) - bagaimana semua bagian saling terhubung.
