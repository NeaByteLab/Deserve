---
description: "Daftarkan middleware validasi dengan Mware.validator, batasi per rute, dan tumpuk beberapa sumber sekaligus."
---

# Middleware Validator

`Mware.validator(schema)` mengubah sebuah schema menjadi middleware. Middleware ini membaca setiap sumber yang disebut di schema, menjalankan kontrak yang cocok, dan menyimpan hasilnya di request state untuk dibaca handler.

## Mendaftarkan Middleware

Berikan middleware ke `router.use`, panggilan yang sama yang mendaftarkan setiap middleware lain:

```typescript twoslash
import { Define, Mware, Router } from '@neabyte/deserve'

const router = new Router({
  routesDir: './routes'
})

const createUser = {
  json: Define((body: { name: string }) => ({ name: body.name.trim() }))
}

// Jalankan untuk setiap request
router.use(Mware.validator(createUser))

await router.serve(8000)
```

## Membatasi Ke Satu Rute

Sebuah prefix path membatasi validator ke rute yang cocok, mengikuti aturan di [Middleware Spesifik Rute](/id/middleware/route-specific):

```typescript twoslash
import { Define, Mware, Router } from '@neabyte/deserve'

const router = new Router({
  routesDir: './routes'
})

const createUser = {
  json: Define((body: { name: string }) => ({ name: body.name.trim() }))
}
// ---cut---
// Validasi hanya di bawah /users
router.use('/users', Mware.validator(createUser))
```

Untuk pendaftaran global versus terbatas secara umum, lihat [Middleware Global](/id/middleware/global).

## Memvalidasi Beberapa Sumber

Sebuah schema bisa menyebut lebih dari satu sumber, dan setiap kontrak memvalidasi bagiannya sendiri dari request:

```typescript twoslash
import { Define, Mware, Router } from '@neabyte/deserve'

const router = new Router({ routesDir: './routes' })
// ---cut---
const listUsers = {
  // Nomor halaman dari query string
  query: Define(
    (q: Record<string, string>) => ({ page: Number(q['page'] ?? '1') }),
    (q) => (/^\d*$/.test(q['page'] ?? '') ? true : 'page must be numeric')
  ),
  // Kunci API dari header request
  headers: Define(
    (h: Record<string, string>) => ({ apiKey: h['x-api-key'] ?? '' }),
    (h) => (h['x-api-key'] ? true : 'x-api-key header is required')
  )
}

// Validasi query dan headers bersamaan
router.use('/users', Mware.validator(listUsers))
```

Beberapa sumber divalidasi dalam urutan kemunculan key-nya, dan sumber pertama yang gagal menghentikan sisanya. Aturan urutan itu ada di [Pola Lanjutan](/id/middleware/validation/advanced-patterns#urutan-validasi).

![Urutan sumber: sebuah schema memvalidasi sumbernya dalam urutan key, jadi kontrak query yang gagal melempar 422 yang hanya membawa alasan query sementara kontrak headers dan cookies setelahnya tidak pernah berjalan](/diagrams/validation-source-order.png)

## Menumpuk Validator

Mendaftarkan lebih dari satu validator pada rute yang sama menggabungkan hasilnya. Setiap validator menambahkan sumbernya sendiri ke state bersama, jadi pembacaan kemudian melihat setiap sumber tervalidasi sekaligus:

```typescript twoslash
import { Define, Mware, Router } from '@neabyte/deserve'

const router = new Router({ routesDir: './routes' })

const queryRules = {
  query: Define((q: Record<string, string>) => ({ page: Number(q['page'] ?? '1') }))
}
const bodyRules = {
  json: Define((body: { name: string }) => ({ name: body.name.trim() }))
}
// ---cut---
// Dua validator mengisi satu state gabungan
router.use('/users', Mware.validator(queryRules))
router.use('/users', Mware.validator(bodyRules))
```

Handler membaca `query` dan `json` gabungan dalam satu panggilan, ditunjukkan di [Membaca Data Tervalidasi](/id/middleware/validation/reading-data).

## Params Ditolak Di Sini

Sebuah schema yang menyebut `params` melempar saat pendaftaran dengan [`Deno.errors.InvalidData`](https://docs.deno.com/api/deno/~/Deno.errors.InvalidData). Params rute baru tersedia setelah middleware berjalan, jadi middleware hanya akan melihat object kosong. Errornya menunjuk ke alat yang tepat:

```typescript twoslash
import { Define, Mware } from '@neabyte/deserve'

// Melempar InvalidData saat pendaftaran
Mware.validator({
  params: Define((p: Record<string, string>) => p)
})
```

Validasi params di dalam handler dengan `Validator.check`, dibahas di [Membaca Data Tervalidasi](/id/middleware/validation/reading-data#memeriksa-params-di-handler).

## Schema Kosong Ditolak

Sebuah schema tanpa kontrak sumber juga melempar [`Deno.errors.InvalidData`](https://docs.deno.com/api/deno/~/Deno.errors.InvalidData) saat pendaftaran, karena validator tanpa apa pun untuk divalidasi adalah kesalahan perakitan yang layak ditangkap sejak awal:

```typescript twoslash
import { Mware } from '@neabyte/deserve'

// Melempar InvalidData, tanpa sumber
Mware.validator({})
```

Kedua penolakan terjadi saat server menyala, bukan pada sebuah request, jadi schema yang rusak tidak pernah mencapai trafik produksi.

## Langkah Berikutnya

- [Membaca Data Tervalidasi](/id/middleware/validation/reading-data) - membaca output tersimpan di handler.
- [Define Schema](/id/middleware/validation/define-schema) - membentuk kontrak yang ditunjuk schema.
- [Pola Lanjutan](/id/middleware/validation/advanced-patterns) - memilih schema per method pada satu prefix bersama.
- [Ringkasan Validasi](/id/middleware/validation/overview) - bagaimana semua bagian saling terhubung.
