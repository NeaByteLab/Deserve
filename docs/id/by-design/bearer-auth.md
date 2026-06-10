---
description: "Kenapa Deserve membawa Basic Auth tapi tidak Bearer, dan cara menyusun auth token untuk skema apa pun."
---

# Bearer Auth

Deserve membawa [Basic Auth](/id/middleware/basic-auth) tapi tidak ada middleware Bearer, dan pemisahan antara keduanya adalah intinya.

## Kenapa Tidak Dibawa

Bearer hanyalah sebuah amplop. Header [`Authorization: Bearer <token>`](https://datatracker.ietf.org/doc/html/rfc6750) membawa token, dan apa yang dianggap token valid berubah seiring ekosistem. Satu layanan memverifikasi tanda tangan [JWT](https://datatracker.ietf.org/doc/html/rfc7519), lain mengambil kunci publik berputar dari endpoint [JWKS](https://datatracker.ietf.org/doc/html/rfc7517), lain memanggil API introspeksi untuk token buram, dan algoritma penanda bisa RS256, ES256, atau HS256.

Menanam salah satu pilihan itu akan mengunci setiap proyek ke satu skema. Ketika spesifikasi bergerak atau sebuah tim memutar kunci dengan cara berbeda, jawaban bawaan itu berubah jadi belenggu ketimbang bantuan. Jadi keputusannya adalah membiarkan verifikasi terbuka dan membiarkan developer membawa skema yang dibutuhkan kasusnya.

## Kenapa Basic Auth Dibawa Tapi Bearer Tidak

[Basic Auth](/id/middleware/basic-auth) adalah satu skema tetap. Header membawa username dan password base64, pengecekannya adalah perbandingan waktu konstan terhadap sebuah daftar, dan tak ada yang perlu dipilih. Stabilitas itulah yang membuatnya cocok di dalam framework.

Bearer sebaliknya. Format token, tanda tangan, dan sumber kepercayaan semuanya berbeda, jadi tak ada satu pengecekan untuk dibawa. Kedua skema membaca header `Authorization` yang sama, tapi hanya satu yang punya jawaban benar tunggal.

## Bagian yang Sudah Ada

Penjaga token adalah komposisi kecil di atas bagian yang sudah ada:

- **Baca header** - [`ctx.header('authorization')`](/id/core-concepts/context-object#akses-data-request) mengembalikan nilai `Authorization` mentah.
- **Berjalan lebih awal** - [middleware global](/id/middleware/global) berjalan sebelum route handler dan bisa menghentikan request dengan mengembalikan `Response`.
- **Tolak bersih** - [`ctx.handleError(401, ...)`](/id/core-concepts/context-object#penanganan-error) mengarah lewat [`router.catch()`](/id/error-handling/object-details) saat satu diatur.
- **Bawa hasilnya** - [`ctx.state`](/id/core-concepts/context-object#berbagi-state) menyerahkan identitas terdekode ke handler di hilir.

## Sebuah Penjaga Bearer

Middleware ini menarik token dari header, memverifikasinya, dan menyimpan hasilnya untuk handler berikutnya. Placeholder `verifyToken` mewakili skema pilihan, sebuah pengecekan JWT, lookup JWKS, atau panggilan introspeksi.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
import { Router } from '@neabyte/deserve'

const router = new Router()
declare function verifyToken(token: string): Promise<{ userId: string } | null>
// ---cut---
router.use(async (ctx, next) => {
  const header = ctx.header('authorization')
  const spaceIndex = header ? header.indexOf(' ') : -1
  const scheme = spaceIndex > 0 ? header!.slice(0, spaceIndex) : ''

  // Tolak apa pun yang bukan Bearer
  if (scheme.toLowerCase() !== 'bearer') {
    return await ctx.handleError(401, new Error('Missing Bearer token'))
  }

  // Verifikasi dengan skema pilihan
  const token = header!.slice(spaceIndex + 1).trim()
  const claims = await verifyToken(token)
  if (!claims) {
    return await ctx.handleError(401, new Error('Invalid token'))
  }

  // Serahkan identitas ke handler
  ctx.state.userId = claims.userId
  return await next()
})

await router.serve(8000)
```

Handler lalu membaca identitas langsung dari state, tanpa parsing token sendiri.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Baca apa yang disimpan penjaga
  const userId = ctx.state.userId
  return ctx.send.json({ userId })
}
```

## Mengarahkan Kegagalan Lewat Satu Handler

Penjaga di atas mengembalikan `401` dari dalam middleware. Untuk mengirim setiap kegagalan auth lewat satu tempat, bungkus middleware dengan [`WrapMware`](/id/middleware/global#membungkus-middleware-dengan-penanganan-error) dan lempar saat ditolak, lalu bentuk balasannya dengan [`router.catch()`](/id/error-handling/object-details).

```typescript twoslash
import type { Context } from '@neabyte/deserve'
import { Router, WrapMware } from '@neabyte/deserve'

const router = new Router()
declare function verifyToken(token: string): Promise<{ userId: string } | null>
// ---cut---
// Lemparan sampai router.catch saat dibungkus
const bearer = WrapMware('Bearer', async (ctx: Context, next) => {
  const header = ctx.header('authorization')
  if (!header?.toLowerCase().startsWith('bearer ')) {
    throw new Error('Missing Bearer token')
  }
  const claims = await verifyToken(header.slice(7).trim())
  if (!claims) {
    throw new Error('Invalid token')
  }
  ctx.state.userId = claims.userId
  return await next()
})

// Terapkan penjaga dan bentuk error
router.use(bearer)
router.catch((ctx, err) => {
  return ctx.send.json(
    {
      error: err.error?.message
    },
    {
      status: 401
    }
  )
})
```

Ini pola pembungkusan yang sama dipakai [Basic Auth](/id/middleware/basic-auth) secara internal, kini membawa pengecekan token alih-alih perbandingan kredensial.

## Menjaga Hanya Sebagian Rute

Penjaga token sering cocok di prefix API sementara halaman publik tetap terbuka. Middleware per-path membatasi pengecekan ke satu prefix, bentuk yang sama ditunjukkan di [middleware global](/id/middleware/global#middleware-per-path).

```typescript twoslash
import type { Context } from '@neabyte/deserve'
import { Router } from '@neabyte/deserve'

const router = new Router()
declare function verifyToken(token: string): Promise<{ userId: string } | null>
// ---cut---
// Jaga hanya rute /api
router.use('/api', async (ctx, next) => {
  const header = ctx.header('authorization')
  const claims = header?.toLowerCase().startsWith('bearer ')
    ? await verifyToken(header.slice(7).trim())
    : null
  if (!claims) {
    return await ctx.handleError(401, new Error('Invalid token'))
  }
  ctx.state.userId = claims.userId
  return await next()
})
```

Untuk session sisi server yang ditandatangani framework alih-alih token, lihat [middleware session](/id/middleware/session).
