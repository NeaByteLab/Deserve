---
description: "Daftarkan middleware validasi dengan Validator.check, batasi per rute, dan gabungkan beberapa sumber dalam satu schema."
---

# Middleware Validator

`Validator.check(schema)` mengubah sebuah schema menjadi middleware. Middleware ini membaca setiap sumber yang disebut di schema, menjalankan kontrak yang cocok, dan menyimpan hasilnya di context untuk dibaca handler.

## Mendaftarkan Middleware

Berikan middleware ke `router.use`, panggilan yang sama yang mendaftarkan setiap middleware lain:

```typescript twoslash
import { Router, Validator } from '@neabyte/deserve'

const router = new Router({
  routes: { directory: './routes' }
})

const createUser = {
  body: Validator.define((body: { name: string }) => ({ name: body.name.trim() }))
}

// Jalankan untuk setiap request
router.use(Validator.check(createUser))

await router.serve(8000)
```

## Membatasi Ke Satu Rute

Sebuah prefix path membatasi validator ke rute yang cocok, mengikuti aturan di [Middleware Spesifik Rute](/id/middleware/route-specific):

```typescript twoslash
import { Router, Validator } from '@neabyte/deserve'

const router = new Router({
  routes: { directory: './routes' }
})

const createUser = {
  body: Validator.define((body: { name: string }) => ({ name: body.name.trim() }))
}
// ---cut---
// Validasi hanya di bawah /users
router.use('/users', Validator.check(createUser))
```

Untuk pendaftaran global versus terbatas secara umum, lihat [Middleware Global](/id/middleware/global).

## Memvalidasi Beberapa Sumber

Sebuah schema bisa menyebut lebih dari satu sumber, dan setiap kontrak memvalidasi bagiannya sendiri dari request:

```typescript twoslash
import { Router, Validator } from '@neabyte/deserve'

const router = new Router({ routes: { directory: './routes' } })
// ---cut---
const listUsers = {
  // Nomor halaman dari query string
  query: Validator.define(
    (q: Record<string, string>) => ({ page: Number(q['page'] ?? '1') }),
    (q) => (/^\d*$/.test(q['page'] ?? '') ? true : 'page must be numeric')
  ),
  // Kunci API dari header request
  headers: Validator.define(
    (h: Record<string, string>) => ({ apiKey: h['x-api-key'] ?? '' }),
    (h) => (h['x-api-key'] ? true : 'x-api-key header is required')
  )
}

// Validasi query dan headers bersamaan
router.use('/users', Validator.check(listUsers))
```

Beberapa sumber divalidasi dalam urutan kemunculan key-nya, dan sumber pertama yang gagal menghentikan sisanya. Aturan urutan itu ada di [Pola Lanjutan](/id/middleware/validation/advanced-patterns#urutan-validasi).

![Urutan sumber: sebuah schema memvalidasi sumbernya dalam urutan key, jadi kontrak query yang gagal melempar 422 yang hanya membawa alasan query sementara kontrak headers dan cookies setelahnya tidak pernah berjalan](/diagrams/validation-source-order.png)

## Satu Schema Per Rute

Setiap validator menyimpan hasilnya sendiri di context, dan validator berikutnya menggantikan nilai tersimpan alih-alih menggabungkannya. Mendaftarkan dua validator pada rute yang sama menyisakan hanya yang terakhir bisa dibaca, jadi beberapa sumber sebaiknya berada dalam satu schema:

```typescript twoslash
import { Router, Validator } from '@neabyte/deserve'

const router = new Router({ routes: { directory: './routes' } })
// ---cut---
// Gabungkan sumber dalam satu schema
const userRules = {
  query: Validator.define((q: Record<string, string>) => ({ page: Number(q['page'] ?? '1') })),
  body: Validator.define((body: { name: string }) => ({ name: body.name.trim() }))
}

// Satu validator membawa kedua sumber
router.use('/users', Validator.check(userRules))
```

Handler membaca `query` dan `body` bersamaan dalam satu panggilan lewat `ctx.get.validated()`, ditunjukkan di [Membaca Data Tervalidasi](/id/middleware/validation/reading-data).

## Sumber Tak Didukung Ditolak

Sebuah schema yang menyebut sumber selain `body`, `cookies`, `headers`, atau `query` melempar `Deno.errors.InvalidData` saat pendaftaran. Param rute baru tersedia setelah middleware berjalan, jadi middleware hanya akan melihat object kosong. Validasi param di dalam handler dengan panggilan kontrak langsung, dibahas di [Membaca Data Tervalidasi](/id/middleware/validation/reading-data#memeriksa-param-di-handler).

## Schema Kosong Ditolak

Sebuah schema tanpa kontrak sumber juga melempar `Deno.errors.InvalidData` saat pendaftaran, karena validator tanpa apa pun untuk divalidasi adalah kesalahan perakitan yang layak ditangkap sejak awal:

```typescript twoslash
import { Validator } from '@neabyte/deserve'

// Melempar InvalidData, tanpa sumber
Validator.check({})
```

Kedua penolakan terjadi saat server menyala, bukan pada sebuah request, jadi schema yang rusak tidak pernah mencapai trafik produksi.

## Langkah Berikutnya

- [Membaca Data Tervalidasi](/id/middleware/validation/reading-data) - membaca output tersimpan di handler
- [Define Schema](/id/middleware/validation/define-schema) - membentuk kontrak yang ditunjuk schema
- [Pola Lanjutan](/id/middleware/validation/advanced-patterns) - memilih schema per method pada satu prefix bersama
- [Ringkasan Validasi](/id/middleware/validation/overview) - bagaimana semua bagian saling terhubung
