---
description: "Validasi input request dengan kontrak Typebox yang terpasang ke Deserve lewat middleware validasi."
---

# Ringkasan Validasi

> **Referensi**: [Repositori GitHub Typebox](https://github.com/NeaByteLab/Typebox)

Deserve memvalidasi input request lewat kontrak [Typebox](https://github.com/NeaByteLab/Typebox), sebuah library kontrak tanpa dependency yang ikut dalam framework. Sebuah kontrak menjelaskan satu sumber request, middleware validator menjalankannya sebelum handler, dan handler membaca data bertipe yang sudah lolos setiap aturan.

Validasi berdiri di samping middleware lain dan mengawasi request sebelum mencapai rute, tempat yang sama dengan [CORS](/id/middleware/cors) dan [Session](/id/middleware/session) ikut terpasang.

## Tiga Bagian

Validasi terbentuk dari tiga export, masing-masing dengan satu tugas:

- **`Define`** membangun kontrak dari sebuah transform dan guard opsional. Lihat [Define Schema](/id/middleware/validation/define-schema).
- **`Mware.validator`** mengubah schema menjadi middleware yang memvalidasi sumber request. Lihat [Middleware Validator](/id/middleware/validation/validator-middleware).
- **`Validator`** membaca data tervalidasi di dalam handler dan memeriksa nilai sesuai kebutuhan. Lihat [Membaca Data Tervalidasi](/id/middleware/validation/reading-data).

![Validasi punya tiga bagian dengan satu tugas masing-masing: Define membangun kontrak, Mware.validator menjalankan kontrak sebagai middleware, dan Validator.read mengembalikan data tervalidasi bertipe di dalam handler](/diagrams/validation-three-pieces.png)

## Schema Memetakan Sumber Ke Kontrak

Sebuah schema adalah object biasa yang memasangkan sumber request dengan kontrak:

```typescript twoslash
import { Define } from '@neabyte/deserve'

// Satu kontrak per sumber request
const schema = {
  json: Define((body: { name: string }) => body)
}
```

Ada enam sumber, dan masing-masing membaca dari bagian yang cocok di [Context](/id/core-concepts/context-object):

| Sumber    | Membaca dari    | Bentuk                    |
| --------- | --------------- | ------------------------- |
| `body`    | `ctx.body()`    | body mentah hasil parse   |
| `cookies` | `ctx.cookie()`  | `Record<string, string>`  |
| `headers` | `ctx.header()`  | `Record<string, string>`  |
| `json`    | `ctx.json()`    | nilai JSON hasil parse    |
| `params`  | `ctx.params()`  | `Record<string, string>`  |
| `query`   | `ctx.query()`   | `Record<string, string>`  |

## Alur Request

Sebuah request tervalidasi melewati empat langkah:

1. Middleware validator membaca setiap sumber yang disebut di schema.
2. Middleware menjalankan kontrak yang cocok pada nilai sumber itu.
3. Kontrak yang lolos menyimpan hasilnya di request state.
4. Handler membaca state itu dengan tipe penuh.

![Alur request validasi: middleware membaca setiap sumber dengan ctx.json atau ctx.query, menjalankan kontrak yang cocok, menyimpan hasil yang lolos di stateKeys.validated, dan handler membacanya kembali bertipe lewat Validator.read](/diagrams/validation-request-flow.png)

```typescript twoslash
import { type Context, Define, Mware, Router, Validator } from '@neabyte/deserve'

const router = new Router({
  routesDir: './routes'
})

const schema = {
  json: Define((body: { name: string }) => ({ name: body.name.trim() }))
}

// Validasi body JSON sebelum handler
router.use('/users', Mware.validator(schema))

await router.serve(8000)
```

```typescript twoslash
import { type Context, Define, Validator } from '@neabyte/deserve'

const schema = {
  json: Define((body: { name: string }) => ({ name: body.name.trim() }))
}
// ---cut---
export function POST(ctx: Context): Response {
  // Baca data bertipe yang sudah lolos
  const { json } = Validator.read<typeof schema>(ctx)
  return ctx.send.json({ created: json.name })
}
```

## Kegagalan Menjadi 422

Kontrak yang menolak inputnya akan melempar, dan framework memetakan lemparan itu ke respons **422 Unprocessable Content**. Alasan kegagalan menumpang di `error.cause` sebagai array string, jadi handler kustom membacanya dan memunculkan persis field mana yang salah. Pembentukan respons error tetap di satu tempat lewat [Detail Object](/id/error-handling/object-details), `router.catch` yang sama yang menangani setiap error lain.

Lemparan dari input client tidak pernah menjadi 500. Aturan pemetaan itu ada di [Membaca Data Tervalidasi](/id/middleware/validation/reading-data#cara-kegagalan-muncul).

## Langkah Berikutnya

- [Define Schema](/id/middleware/validation/define-schema) - menulis kontrak dengan transform dan guard.
- [Middleware Validator](/id/middleware/validation/validator-middleware) - mendaftarkan validasi per sumber dan per rute.
- [Membaca Data Tervalidasi](/id/middleware/validation/reading-data) - membaca output bertipe dan memeriksa params di handler.
- [Pola Lanjutan](/id/middleware/validation/advanced-patterns) - memilih schema per method pada satu prefix bersama.
