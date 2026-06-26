---
description: "Pilih validator yang tepat per request saat satu prefix menampung beberapa method, pola selectValidator."
---

# Pola Lanjutan

Validator prefix berjalan untuk setiap method dan setiap path bersarang di bawah prefix itu. Itu baik saat satu schema cocok untuk seluruh prefix, tetapi sebuah resource nyata sering mencampur beberapa bentuk di bawah satu path. Halaman ini membahas pola yang memilih schema yang tepat per request.

## Validator Berjalan Sebelum Routing

Middleware berjalan sebelum router mencocokkan method atau path, jadi validator prefix menyala pada setiap request yang disentuh prefix, bahkan yang tidak dilayani handler mana pun. Sebuah validator di `/accounts` berjalan untuk `POST /accounts` dan untuk `GET /accounts/anything`, keduanya sebelum router memutuskan tidak ada rute seperti itu.

Saat validator itu gagal, 422-nya mencapai client lebih dulu dan menyembunyikan status yang akan diproduksi router:

- `POST /accounts` dengan header yang hilang mengembalikan **422**, bukan **405** yang akan diberikan handler POST yang tidak ada
- `GET /accounts/missing` dengan header yang hilang mengembalikan **422**, bukan **404** untuk path tak dikenal

Membatasi validator berdasarkan method dan path menjaga validasi pada request yang menjadi haknya dan membiarkan router menjawab sisanya. Dengan batas yang tepat, `POST /transfers/tx_abc123` mengembalikan **405** yang bersih alih-alih 422 validasi body, karena validator melewati request yang memang bukan tugasnya.

## Satu Prefix, Beberapa Bentuk

`router.use('/transfers', ...)` mencocokkan `/transfers` dan setiap path yang berlanjut dengan garis miring, seperti `/transfers/tx_abc123`. Aturan pencocokan berasal dari [Middleware Spesifik Rute](/id/middleware/route-specific). Sebuah resource `transfers` biasanya membawa dua request berbeda di bawah satu prefix itu:

- `POST /transfers` mengirim body JSON yang butuh kontrak `body`
- `GET /transfers/:id` tidak membawa body dan memvalidasi param-nya di dalam handler

Mendaftarkan validator `body` pada seluruh prefix akan menjalankannya pada GET juga, dan membaca body yang tidak ada mengubah request valid menjadi kegagalan. Validator perlu menyala hanya untuk POST.

## Helper selectValidator

Sebuah pembungkus kecil menyelesaikannya. Helper ini menerima sebuah pemilih yang mengembalikan schema untuk request saat ini atau `undefined` untuk melewati, membangun validator sesuai kebutuhan, dan menyimpannya di cache agar setiap schema dibungkus sekali:

![Pola selectValidator: sebuah request pada prefix bersama mencapai pemilih yang membaca method dan pathname, mengembalikan schema membangun dan men-cache validator sekali sebelum handler, dan mengembalikan undefined memanggil next sehingga request mengalir lewat tanpa disentuh](/diagrams/validation-select-validator.png)

```typescript twoslash
import { type Context, type MiddlewareFn, Validator, type ValidationSchema } from '@neabyte/deserve'

// Pilih sebuah schema atau lewati validasi
function selectValidator(pick: (ctx: Context) => ValidationSchema | undefined): MiddlewareFn {
  const cache = new Map<ValidationSchema, MiddlewareFn>()
  return async (ctx: Context, next) => {
    const schema = pick(ctx)
    if (schema === undefined) {
      return await next()
    }
    let validator = cache.get(schema)
    if (validator === undefined) {
      // Bangun sekali, pakai ulang nanti
      validator = Validator.check(schema)
      cache.set(schema, validator)
    }
    return await validator(ctx, next)
  }
}
```

Mengembalikan `undefined` langsung memanggil `next`, jadi request mengalir lewat tanpa disentuh. Mengembalikan sebuah schema menjalankan [Middleware Validator](/id/middleware/validation/validator-middleware) yang cocok sebelum handler.

## Menghubungkan Ke Sebuah Prefix

Pemilih membaca `ctx.get.pathname()` dan method request untuk memutuskan. Di sini kontrak `body` berjalan hanya untuk POST koleksi, dan GET diteruskan untuk memvalidasi param-nya di handler:

```typescript twoslash
import { type Context, type MiddlewareFn, Router, Validator, type ValidationSchema } from '@neabyte/deserve'

declare function selectValidator(pick: (ctx: Context) => ValidationSchema | undefined): MiddlewareFn

const router = new Router({ routes: { directory: './routes' } })

const createTransfer = {
  body: Validator.define((body: { amount: number }) => ({ amount: body.amount }))
}
// ---cut---
// Validasi body hanya pada POST koleksi
router.use(
  '/transfers',
  selectValidator((ctx) =>
    ctx.get.pathname() === '/transfers' && ctx.get.method() === 'POST'
      ? createTransfer
      : undefined
  )
)
```

Handler `GET /transfers/:id` lalu memvalidasi param-nya sendiri dengan panggilan kontrak langsung, pendekatan dari [Membaca Data Tervalidasi](/id/middleware/validation/reading-data#memeriksa-param-di-handler). Validasi body dan validasi param tetap terpisah, masing-masing menyala hanya di tempat yang sesuai.

## Memilih Di Antara Beberapa Schema

Pemilih yang sama menangani lebih dari satu cabang saat sebuah prefix menampung banyak method. Setiap cabang mengembalikan schema untuk kasus itu, dan apa pun yang tidak cocok mengembalikan `undefined`:

```typescript twoslash
import { type Context, type MiddlewareFn, Router, Validator, type ValidationSchema } from '@neabyte/deserve'

declare function selectValidator(pick: (ctx: Context) => ValidationSchema | undefined): MiddlewareFn

const router = new Router({ routes: { directory: './routes' } })

const listQuery = { query: Validator.define((q: Record<string, string>) => ({ page: Number(q['page'] ?? '1') })) }
const createBody = { body: Validator.define((body: { name: string }) => ({ name: body.name.trim() })) }
// ---cut---
// Satu pemilih, satu schema per method
router.use(
  '/users',
  selectValidator((ctx) => {
    const isCollection = ctx.get.pathname() === '/users'
    if (isCollection && ctx.get.method() === 'GET') {
      return listQuery
    }
    if (isCollection && ctx.get.method() === 'POST') {
      return createBody
    }
    return undefined
  })
)
```

Ini menjaga satu pendaftaran validator per prefix sementara setiap method mendapat schema persis yang dibutuhkannya.

## Urutan Validasi

Mengetahui apa yang gagal lebih dulu membuat 422 dapat diprediksi. Dua aturan mencakup setiap kasus, satu untuk sumber dan satu untuk guard.

Sebuah schema dengan beberapa sumber memvalidasinya dalam urutan kemunculan key, dan sumber pertama yang gagal menghentikan sisanya. Sebuah schema `{ query, headers, cookies }` dengan query buruk dan header yang hilang hanya melaporkan alasan query, karena `query` datang lebih dulu dan kontrak header tidak pernah berjalan:

![Urutan sumber lintas schema: kontrak query buruk melempar lebih dulu dan hanya melaporkan alasan query, sementara kontrak headers dan cookies yang datang setelahnya dalam urutan key tidak pernah berjalan](/diagrams/validation-source-order.png)

```typescript twoslash
import { Validator } from '@neabyte/deserve'

// Sumber divalidasi dalam urutan key
const listAccounts = {
  query: Validator.define((q: Record<string, string>) => q),
  headers: Validator.define((h: Record<string, string>) => h),
  cookies: Validator.define((c: Record<string, string>) => c)
}
```

Di dalam satu sumber, kontrak menentukan seberapa banyak yang dilaporkan. Satu guard yang mendorong ke array alasan memunculkan setiap field rusak sekaligus, sementara daftar guard berhenti pada kegagalan pertama. Pembagian itu datang langsung dari [Define Schema](/id/middleware/validation/define-schema#menyusun-beberapa-guard), jadi sebuah guard bentuk bisa melaporkan semua field yang hilang sementara guard invariant berikutnya hanya berjalan setelah bentuknya terpenuhi.

Hasilnya terbaca rapi. Di antara sumber, kegagalan pertama menang, di dalam satu sumber kontrak memilih satu alasan atau banyak, dan di antara guard, guard pertama yang gagal menang.

## Menyusun Struktur Schema

Kontrak tidak harus berada di samping rute yang memakainya. Saat sebuah proyek tumbuh, folder tersendiri menjaga tiap kontrak tetap kecil dan membiarkan beberapa rute berbagi aturan yang sama. Sebuah tata letak yang berskala biasanya terlihat seperti ini:

```
schemas/
  _shared.ts    # helper guard kecil dipakai lintas kontrak
  transfer.ts   # satu resource, kontraknya
  account.ts
  index.ts      # barrel yang mengelompokkan kontrak ke schema
routes/
  transfers.ts
  accounts.ts
```

Barrel mengelompokkan kontrak tunggal menjadi schema per sumber yang dibaca sebuah rute, jadi perakitannya tetap di satu tempat:

```typescript twoslash
import { Validator } from '@neabyte/deserve'
declare const Transfer: ReturnType<typeof Validator.define>
declare const AccountQuery: ReturnType<typeof Validator.define>
declare const ApiKeyHeader: ReturnType<typeof Validator.define>
// ---cut---
// schemas/index.ts kelompokkan kontrak per sumber
export const createTransferSchema = {
  body: Transfer
}

export const listAccountsSchema = {
  query: AccountQuery,
  headers: ApiKeyHeader
}
```

Sebuah rute mengimpor hanya tipe schema yang dibutuhkannya, sehingga handler tetap fokus pada respons alih-alih aturan:

```typescript twoslash
import { type Context, Validator } from '@neabyte/deserve'
const createTransferSchema = { body: Validator.define((body: { amount: number }) => ({ amount: body.amount })) }
// ---cut---
// routes/transfers.ts baca body tervalidasi
export function POST(ctx: Context): Response {
  const { body } = ctx.get.validated<typeof createTransferSchema>()
  return ctx.send.json({ amount: body.amount }, { status: 201 })
}
```

Ini sebuah saran, bukan aturan. Aplikasi kecil menyimpan kontrak inline di samping rute, dan yang lebih besar memisahkannya begitu sebuah kontrak layak dipakai ulang.

## Langkah Berikutnya

- [Middleware Validator](/id/middleware/validation/validator-middleware) - pendaftaran per sumber yang dibungkus pola ini
- [Membaca Data Tervalidasi](/id/middleware/validation/reading-data) - memvalidasi param di handler di samping pola ini
- [Middleware Spesifik Rute](/id/middleware/route-specific) - aturan pencocokan prefix di baliknya
- [Ringkasan Validasi](/id/middleware/validation/overview) - bagaimana semua bagian saling terhubung
