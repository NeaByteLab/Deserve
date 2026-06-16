---
description: "Baca data tervalidasi bertipe dengan Validator.read, periksa params di handler, dan lihat cara kegagalan dipetakan ke 422."
---

# Membaca Data Tervalidasi

Handler membaca apa yang dihasilkan validator. `Validator.read` mengembalikan output tersimpan untuk sebuah schema, dan `Validator.check` memvalidasi sebuah nilai di tempat.

## Membaca Output Tersimpan

`Validator.read<typeof schema>(ctx)` mengembalikan data tervalidasi yang dipetakan per sumber. Memberikan tipe schema memberi handler tipe penuh untuk setiap field:

```typescript twoslash
import { type Context, Define, Validator } from '@neabyte/deserve'

const createUser = {
  json: Define((body: { name: string }) => ({ name: body.name.trim() }))
}
// ---cut---
export function POST(ctx: Context): Response {
  // Output bertipe, sudah tervalidasi
  const { json } = Validator.read<typeof createUser>(ctx)
  return ctx.send.json({ created: json.name })
}
```

Bentuknya mencerminkan schema, jadi schema dengan `query` dan `headers` mengembalikan kedua key dengan tipe output kontraknya sendiri. Middleware yang menyimpan state ini dibahas di [Middleware Validator](/id/middleware/validation/validator-middleware).

## Membaca Tanpa Validator Melempar 500

`Validator.read` mengharapkan [Middleware Validator](/id/middleware/validation/validator-middleware) sudah berjalan lebih dulu. Memanggilnya tanpa state tervalidasi melempar **500**, karena mencapai pembacaan tanpa apa pun tersimpan berarti middleware tidak pernah didaftarkan. Ini kesalahan perakitan di kode, bukan input buruk dari client.

```typescript twoslash
import { type Context, Define, Validator } from '@neabyte/deserve'

const createUser = {
  json: Define((body: { name: string }) => body)
}
// ---cut---
export function POST(ctx: Context): Response {
  // Melempar 500 jika Mware.validator tak berjalan
  const { json } = Validator.read<typeof createUser>(ctx)
  return ctx.send.json(json)
}
```

## Memeriksa Params Di Handler

Params rute baru tersedia setelah middleware berjalan, jadi [Middleware Validator](/id/middleware/validation/validator-middleware#params-ditolak-di-sini) menolak sumber `params`. Handler memvalidasinya langsung dengan `Validator.check(contract, value)`:

```typescript twoslash
import { type Context, Define, Validator } from '@neabyte/deserve'

const UserId = Define(
  (params: Record<string, string>) => ({ id: Number(params['id']) }),
  (params) => (/^\d+$/.test(params['id'] ?? '') ? true : 'id must be numeric')
)
// ---cut---
export function GET(ctx: Context): Response {
  // Validasi param rute yang cocok
  const { id } = Validator.check(UserId, ctx.params())
  return ctx.send.json({ id })
}
```

`Validator.check` mengembalikan output kontrak saat nilai lolos dan melempar saat gagal, lemparan yang sama dengan yang diproduksi middleware. Cara ini bekerja untuk nilai apa pun, tidak hanya params, sehingga berguna untuk memvalidasi sepotong data di tengah handler.

## Cara Kegagalan Muncul

Kontrak yang menolak inputnya akan melempar, dan framework memetakan lemparan itu ke sebuah status:

- Error yang sudah membawa status diteruskan tanpa diubah.
- Error yang membawa alasan kegagalan menjadi **422 Unprocessable Content**, dengan alasan terjaga di `error.cause` sebagai array string.
- Lemparan lain dari input client menjadi **422** umum.

Input client tidak pernah berubah menjadi 500. Jaminan itu menjaga body malformed, query string buruk, atau guard yang melempar tetap di sisi client dari garis status tempat seharusnya.

![Cara lemparan validasi dipetakan ke status: error yang sudah membawa status diteruskan, error dengan alasan menjadi 422 yang menjaga alasan itu, lemparan client lain menjadi 422 umum, dan membaca tanpa validator terdaftar adalah satu-satunya 500 karena itu menandakan kesalahan perakitan alih-alih input buruk](/diagrams/validation-failure-status.png)

Alasan menumpang di `error.cause`, jadi handler kustom membacanya dan membalas dengan detail tingkat field. Pembentukan respons error dipusatkan di [Detail Object](/id/error-handling/object-details), satu `router.catch` yang menangani validasi bersama setiap error lain:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routesDir: './routes'
})
// ---cut---
router.catch((ctx, info) => {
  // Ambil alasan validasi dari cause
  const reasons = Array.isArray(info.error.cause)
    ? info.error.cause.filter((reason): reason is string => typeof reason === 'string')
    : []
  return ctx.send.json(
    { error: 'request_failed', status: info.statusCode, reasons },
    { status: info.statusCode }
  )
})
```

Untuk object `ErrorInfo` lengkap dan respons default saat tidak ada handler, lihat [Detail Object](/id/error-handling/object-details) dan [Perilaku Default](/id/error-handling/default-behavior). Kegagalan validasi juga mengalir lewat event bus observability, jadi sebuah listener bisa mencatatnya, dibahas di [Pelaporan Error](/id/middleware/observability/errors).

## Langkah Berikutnya

- [Define Schema](/id/middleware/validation/define-schema) - menulis kontrak di balik pembacaan.
- [Detail Object](/id/error-handling/object-details) - membentuk respons yang dihasilkan kegagalan.
- [Pola Lanjutan](/id/middleware/validation/advanced-patterns) - memvalidasi params di samping validator body.
- [Ringkasan Validasi](/id/middleware/validation/overview) - bagaimana semua bagian saling terhubung.
