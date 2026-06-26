---
description: "Baca data tervalidasi bertipe dengan ctx.get.validated, periksa param di handler, dan lihat cara kegagalan dipetakan ke 422."
---

# Membaca Data Tervalidasi

Handler membaca apa yang dihasilkan validator. `ctx.get.validated()` mengembalikan output tersimpan untuk sebuah schema, dan panggilan kontrak langsung memvalidasi sebuah nilai di tempat.

## Membaca Output Tersimpan

`ctx.get.validated()` mengembalikan data tervalidasi yang dipetakan per sumber. Tipenya berasal dari definisi schema, jadi handler mendapat keamanan tipe penuh untuk setiap field:

```typescript twoslash
import { type Context, Validator } from '@neabyte/deserve'

const createUser = {
  body: Validator.define((body: { name: string }) => ({ name: body.name.trim() }))
}
// ---cut---
export function POST(ctx: Context): Response {
  // Output bertipe, sudah tervalidasi
  const { body } = ctx.get.validated<typeof createUser>()
  return ctx.send.json({ created: body.name })
}
```

Bentuknya mencerminkan schema, jadi schema dengan `query` dan `headers` mengembalikan kedua key dengan tipe output kontraknya sendiri. Middleware yang menyimpan data ini dibahas di [Middleware Validator](/id/middleware/validation/validator-middleware).

## Membaca Tanpa Validator Melempar

`ctx.get.validated()` mengharapkan [Middleware Validator](/id/middleware/validation/validator-middleware) sudah berjalan lebih dulu. Memanggilnya tanpa data tervalidasi melempar `Deno.errors.NotSupported`, karena mencapai pembacaan tanpa apa pun tersimpan berarti middleware tidak pernah didaftarkan. Ini kesalahan perakitan di kode, bukan input buruk dari client, jadi framework memetakannya ke **501 Not Implemented** lewat jalur [penanganan error](/id/error-handling/object-details) yang sama yang memetakan setiap error yang dilempar.

## Memeriksa Param Di Handler

Param rute baru tersedia setelah middleware berjalan, jadi [Middleware Validator](/id/middleware/validation/validator-middleware) tidak menerima sumber `params`. Handler memvalidasinya langsung dengan memanggil fungsi kontrak:

```typescript twoslash
import { type Context, Validator } from '@neabyte/deserve'

const UserId = Validator.define(
  (params: Record<string, string>) => ({ id: Number(params['id']) }),
  (params) => (/^\d+$/.test(params['id'] ?? '') ? true : 'id must be numeric')
)
// ---cut---
export function GET(ctx: Context): Response {
  // Validasi param rute yang cocok
  const { id } = UserId(ctx.get.param())
  return ctx.send.json({ id })
}
```

Memanggil kontrak langsung mengembalikan output transform saat nilai lolos dan melempar saat gagal, lemparan yang sama dengan yang diproduksi middleware. Cara ini bekerja untuk nilai apa pun, tidak hanya param, sehingga berguna untuk memvalidasi sepotong data di tengah handler.

## Cara Kegagalan Muncul

Kontrak yang menolak inputnya akan melempar, dan framework memetakan lemparan itu ke sebuah status:

- Error yang sudah membawa status diteruskan tanpa diubah
- Error yang membawa alasan kegagalan menjadi **422 Unprocessable Content**, dengan alasan terjaga di `error.cause` sebagai array string
- Lemparan lain dari input client menjadi **422** umum

Input client tidak pernah berubah menjadi 500. Jaminan itu menjaga body malformed, query string buruk, atau guard yang melempar tetap di sisi client dari garis status tempat seharusnya.

![Cara lemparan validasi dipetakan ke status: error yang sudah membawa status diteruskan, error dengan alasan menjadi 422 yang menjaga alasan itu, lemparan client lain menjadi 422 umum, dan membaca tanpa validator terdaftar melempar Deno.errors.NotSupported yang dipetakan ke 501 karena itu menandakan kesalahan perakitan alih-alih input buruk](/diagrams/validation-failure-status.png)

Alasan menumpang di `error.cause`, jadi handler kustom membacanya dan membalas dengan detail tingkat field. Pembentukan respons error dipusatkan di [Detail Object](/id/error-handling/object-details), satu `router.catch` yang menangani validasi bersama setiap error lain:

```typescript twoslash
import { type HttpStatusCode, Router } from '@neabyte/deserve'

const router = new Router({
  routes: { directory: './routes' }
})
// ---cut---
router.catch((ctx, info) => {
  // Ambil alasan validasi dari cause
  const reasons = Array.isArray(info.error.cause)
    ? info.error.cause.filter((reason): reason is string => typeof reason === 'string')
    : []
  return ctx.send.json(
    { error: 'request_failed', status: info.statusCode, reasons },
    { status: info.statusCode as HttpStatusCode }
  )
})
```

Untuk object `ErrorInfo` lengkap dan respons default saat tidak ada handler, lihat [Detail Object](/id/error-handling/object-details) dan [Perilaku Default](/id/error-handling/default-behavior). Kegagalan validasi juga mengalir lewat event bus observability sebagai event `validate:failed`, jadi sebuah listener bisa mencatatnya, dibahas di [Pelaporan Error](/id/middleware/observability/errors).

## Langkah Berikutnya

- [Define Schema](/id/middleware/validation/define-schema) - menulis kontrak di balik pembacaan
- [Detail Object](/id/error-handling/object-details) - membentuk respons yang dihasilkan kegagalan
- [Pola Lanjutan](/id/middleware/validation/advanced-patterns) - memvalidasi param di samping validator body
- [Ringkasan Validasi](/id/middleware/validation/overview) - bagaimana semua bagian saling terhubung
