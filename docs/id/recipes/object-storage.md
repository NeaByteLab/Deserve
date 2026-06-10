---
description: 'Sajikan berkas dari S3, R2, atau object storage apa pun di Deserve lewat hook staticHandler atau route handler.'
---

# Object Storage

[Static serving](/id/static-file/basic) bawaan membaca dari filesystem lokal, jadi `router.static()` saja tidak bisa menjangkau bucket di S3, Cloudflare R2, atau Google Cloud Storage. Jembatannya adalah opsi [`staticHandler`](/id/getting-started/routes-configuration#statichandler), sebuah hook yang mempertahankan route static yang familiar sambil menukar pembacaan berkas dengan fetch ke object storage. Route tetap terdaftar lewat `router.static()`, dan handler menjawab tiap request dari bucket alih-alih dari disk.

## Kenapa Hook dan Bukan Path

Opsi `path` pada [static serving](/id/static-file/basic#path) memetakan prefix URL ke folder yang bisa diresolusi `Deno.stat` dan `Deno.realPath`, yang merupakan kontrak disk lokal. Object storage tidak punya path nyata di disk, jadi pemeriksaan traversal yang aman dan streaming lewat file handle tidak berlaku. Hook `staticHandler` menyerahkan seluruh langkah serve, jadi bucket menjadi sumber kebenaran sementara permukaan route tetap sama.

## Menyajikan Dari Bucket

Sebagian besar object store mengekspos endpoint HTTPS per objek, jadi `fetch` ke `${endpoint}/${key}` menarik byte-nya. Handler memotong prefix URL dari `ctx.pathname` untuk memulihkan kunci objek, lalu mengalirkan body response langsung lewat [`ctx.send.stream`](/id/response/stream):

```typescript twoslash
import { Router, type Context, type ServeOptions } from '@neabyte/deserve'

// Endpoint dasar bucket
const endpoint = 'https://my-bucket.s3.amazonaws.com'

const router = new Router({
  routesDir: 'routes',
  staticHandler: {
    // Sajikan tiap objek dari bucket
    async serve(ctx: Context, options: ServeOptions, urlPath: string) {
      // Pulihkan kunci objek dari path
      const key = ctx.pathname.slice(urlPath.length).replace(/^\//, '')
      const object = await fetch(`${endpoint}/${key}`)
      if (!object.ok || !object.body) {
        return ctx.handleError(404, new Deno.errors.NotFound('Object not found'))
      }
      // Alirkan body bucket ke klien
      const contentType = object.headers.get('content-type') ?? 'application/octet-stream'
      return ctx.send.stream(object.body, undefined, contentType)
    }
  }
})

// Daftarkan route yang dipenuhi handler
router.static(
  '/assets',
  {
    path: 's3'
  }
)

await router.serve(8000)
```

Nilai `path` tetap harus diset pada [`router.static()`](/id/static-file/basic) karena wajib, namun handler mengabaikannya di sini karena bucket menggantikan folder lokal. Request ke `/assets/logo.png` menjadi fetch untuk kunci `logo.png`.

## Meneruskan Byte Range

Static serving menjawab [byte range](/id/static-file/basic#permintaan-byte-range) sendiri, tapi handler kustom kini memegang tugas itu. Meneruskan header `Range` yang masuk ke bucket membiarkan store mengembalikan konten parsial, dan meneruskan kembali status serta header range menjaga penggeser video atau unduhan yang bisa dilanjutkan tetap bekerja:

```typescript twoslash
import type { Context, ServeOptions } from '@neabyte/deserve'
declare const endpoint: string
// ---cut---
async function serve(ctx: Context, options: ServeOptions, urlPath: string) {
  const key = ctx.pathname.slice(urlPath.length).replace(/^\//, '')
  const range = ctx.header('range')

  // Teruskan header Range bila ada
  const object = await fetch(`${endpoint}/${key}`, {
    headers: range ? { Range: range } : {}
  })
  if (!object.ok || !object.body) {
    return ctx.handleError(404, new Deno.errors.NotFound('Object not found'))
  }

  // Cerminkan header range ke klien
  const contentType = object.headers.get('content-type') ?? 'application/octet-stream'
  const contentRange = object.headers.get('content-range')
  if (contentRange) {
    ctx.setHeader('Content-Range', contentRange)
    ctx.setHeader('Accept-Ranges', 'bytes')
  }
  return ctx.send.custom(object.body, {
    status: object.status,
    headers: {
      'Content-Type': contentType
    }
  })
}
```

Sebuah `206 Partial Content` dari bucket mengalir balik tanpa berubah, karena `ctx.send.custom` mempertahankan status yang dipilih bucket.

## Memakai Route Handler Sebagai Ganti

Hook `staticHandler` mencakup satu prefix URL utuh, yang cocok untuk folder aset publik. Satu unduhan di balik auth atau logika bisnis lebih cocok dengan [route handler](/id/core-concepts/file-based-routing) biasa, tempat middleware berjalan lebih dulu dan kunci datang dari [route param](/id/core-concepts/route-patterns):

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const endpoint: string
// ---cut---
// routes/files/[key].ts
export async function GET(ctx: Context): Promise<Response> {
  const key = ctx.param('key')
  const object = await fetch(`${endpoint}/${key}`)
  if (!object.ok || !object.body) {
    return ctx.handleError(404, new Deno.errors.NotFound('Object not found'))
  }
  // Alirkan objek langsung apa adanya
  const contentType = object.headers.get('content-type') ?? 'application/octet-stream'
  return ctx.send.stream(object.body, undefined, contentType)
}
```

Jalur ini menjalankan rantai middleware penuh, jadi menjaganya dengan [basic auth](/id/middleware/basic-auth) atau pemeriksaan [session](/id/middleware/session) terjadi sebelum bucket disentuh sama sekali.

## Menandatangani Request

Bucket privat butuh request yang ditandatangani, bukan `fetch` polos. Dua jalur cocok:

- **URL presigned** - SDK menandatangani URL berumur pendek, dan handler bisa mengalihkan dengan [`ctx.redirect`](/id/response/redirect) atau mengambilnya sisi server.
- **SDK sisi server** - klien resmi menandatangani tiap request, misalnya [AWS SDK for JavaScript](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/welcome.html) untuk S3 atau binding Cloudflare R2 untuk [Workers](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/).

Jalur mana pun yang menandatangani request, body response tetap mengalir lewat `ctx.send.stream`, jadi bentuk penyajiannya tetap sama.

## Menangani Kegagalan

Object storage menambah panggilan jaringan yang bisa timeout atau ditolak, jadi tiap fetch meneruskan kegagalannya ke [penanganan error terpusat](/id/error-handling/object-details) alih-alih membocorkan error mentah. Objek yang hilang dipetakan ke **404**, sementara gangguan upstream dipetakan ke **502** agar penyebabnya tetap terbaca:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const endpoint: string
// ---cut---
export async function GET(ctx: Context): Promise<Response> {
  const key = ctx.param('key')
  try {
    const object = await fetch(`${endpoint}/${key}`)
    if (object.status === 404) {
      return await ctx.handleError(404, new Deno.errors.NotFound('Object not found'))
    }
    // Petakan kegagalan upstream ke 502
    if (!object.ok || !object.body) {
      return await ctx.handleError(502, new Error('Object storage unavailable'))
    }
    return ctx.send.stream(object.body, undefined, 'application/octet-stream')
  } catch (error) {
    // Rutekan tiap gangguan jaringan ke error handling
    return await ctx.handleError(502, error as Error)
  }
}
```

Membentuk ini menjadi satu response klien tinggal di [Penanganan Error](/id/error-handling/object-details), dan menangkapnya untuk log tinggal di [Pelaporan Error](/id/middleware/observability/errors).
