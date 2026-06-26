---
description: 'Sajikan file dari S3, R2, atau object storage apa pun di Deserve lewat route handler.'
---

# Object Storage

[Static serving](/id/static-file/basic) bawaan membaca dari filesystem lokal, jadi `router.static()` dengan opsi `path` saja tidak bisa menjangkau bucket di S3, Cloudflare R2, atau Google Cloud Storage. Jembatannya adalah [custom static handler](/id/static-file/basic#handler-kustom) yang sudah diterima `router.static()`, sebuah fungsi berbentuk `(ctx, urlPath) => Response` yang menukar pembacaan file dengan fetch ke object storage. Mount menjaga permukaan URL yang sama sementara bucket menjadi sumber kebenaran.

## Kenapa Custom Handler

Opsi `path` pada [static serving](/id/static-file/basic#path) memetakan prefix URL ke folder yang bisa diresolusi `Deno.stat` dan `Deno.realPath`, yang merupakan kontrak disk lokal. Object storage tidak punya path nyata di disk, jadi pemeriksaan traversal yang aman dan streaming lewat file handle tidak berlaku. Meneruskan sebuah fungsi alih-alih objek `ServeOptions` menyerahkan seluruh langkah serve, jadi permukaan route tetap identik sementara sebuah `fetch` menjawab tiap request. Handler tetap berjalan hanya setelah route dinamis meleset, urutan [pencocokan](/id/static-file/basic#cara-kerja) yang sama dengan mount bawaan.

## Menyajikan Dari Bucket

Sebagian besar object store mengekspos endpoint HTTPS per objek, jadi `fetch` ke `${endpoint}/${key}` menarik byte-nya. Handler menerima `urlPath` dengan prefix mount sudah dilepas, jadi `/assets/logo.png` tiba sebagai `/logo.png`. Lepas garis miring depan untuk memulihkan kunci objek, lalu alirkan body response langsung lewat [`ctx.send.custom`](/id/response/custom):

```typescript twoslash
import { Router } from '@neabyte/deserve'

// Endpoint dasar bucket
const endpoint = 'https://my-bucket.s3.amazonaws.com'

const router = new Router({
  routes: { directory: './routes' }
})

// Custom handler menjembatani ke bucket
router.static('/assets', async (ctx, urlPath) => {
  // Lepas garis miring depan untuk kunci
  const key = urlPath.replace(/^\//, '')
  const object = await fetch(`${endpoint}/${key}`)
  if (object.status === 404) {
    return await ctx.handleError(404, new Deno.errors.NotFound('Object not found'))
  }
  if (!object.ok || !object.body) {
    return await ctx.handleError(502, new Error('Object storage unavailable'))
  }
  // Alirkan body bucket langsung apa adanya
  const contentType = object.headers.get('content-type') ?? 'application/octet-stream'
  return ctx.send.custom(object.body, {
    headers: {
      'Content-Type': contentType
    }
  })
})

await router.serve(8000)
```

Request ke `/assets/logo.png` menjadi fetch untuk kunci `logo.png`, dan byte bucket mengalir balik tanpa pernah menyentuh disk.

## Meneruskan Byte Range

Penyajian bawaan menjawab [byte range](/id/static-file/basic#permintaan-byte-range) sendiri, tapi custom handler kini memegang tugas itu. Meneruskan header `Range` yang masuk ke bucket membiarkan store mengembalikan konten parsial, dan meneruskan kembali status serta header range menjaga penggeser video atau unduhan yang bisa dilanjutkan tetap bekerja:

```typescript twoslash
import { Router, type HttpStatusCode } from '@neabyte/deserve'

const endpoint = 'https://my-bucket.s3.amazonaws.com'

const router = new Router({
  routes: { directory: './routes' }
})
// ---cut---
router.static('/assets', async (ctx, urlPath) => {
  const key = urlPath.replace(/^\//, '')
  const range = ctx.get.header('range')

  // Teruskan header Range bila ada
  const object = await fetch(`${endpoint}/${key}`, {
    headers: range ? { Range: range } : {}
  })
  if (!object.ok || !object.body) {
    return await ctx.handleError(404, new Deno.errors.NotFound('Object not found'))
  }

  // Cerminkan header range ke klien
  const contentType = object.headers.get('content-type') ?? 'application/octet-stream'
  const contentRange = object.headers.get('content-range')
  if (contentRange) {
    ctx.set.header('Content-Range', contentRange)
    ctx.set.header('Accept-Ranges', 'bytes')
  }
  return ctx.send.custom(object.body, {
    status: object.status as HttpStatusCode,
    headers: {
      'Content-Type': contentType
    }
  })
})
```

Sebuah `206 Partial Content` dari bucket mengalir balik tanpa berubah, karena meneruskan `object.status` ke `ctx.send.custom` mempertahankan status yang dipilih bucket.

## Memakai Route Handler Sebagai Ganti

Route handler lebih cocok untuk satu unduhan di balik auth atau logika bisnis, tempat middleware berjalan lebih dulu dan kunci datang dari [route param](/id/core-concepts/route-patterns):

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const endpoint: string
// ---cut---
// routes/files/[key].ts
export async function GET(ctx: Context): Promise<Response> {
  const key = ctx.get.param('key')
  const object = await fetch(`${endpoint}/${key}`)
  if (!object.ok || !object.body) {
    return await ctx.handleError(404, new Deno.errors.NotFound('Object not found'))
  }
  // Alirkan objek langsung apa adanya
  const contentType = object.headers.get('content-type') ?? 'application/octet-stream'
  return ctx.send.custom(object.body, {
    headers: {
      'Content-Type': contentType
    }
  })
}
```

Jalur ini menjalankan rantai middleware penuh, jadi menjaganya dengan [basic auth](/id/middleware/basic-auth) atau pemeriksaan [session](/id/middleware/session) terjadi sebelum bucket disentuh sama sekali.

## Menandatangani Request

Bucket privat butuh request yang ditandatangani, bukan `fetch` polos. Dua jalur cocok:

- **URL presigned** - SDK menandatangani URL berumur pendek, dan handler bisa mengalihkan dengan [`ctx.send.redirect`](/id/response/redirect) atau mengambilnya sisi server.
- **SDK sisi server** - klien resmi menandatangani tiap request, misalnya [AWS SDK for JavaScript](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/welcome.html) untuk S3 atau binding Cloudflare R2 untuk [Workers](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/).

Jalur mana pun yang menandatangani request, body response tetap mengalir lewat `ctx.send.custom`, jadi bentuk penyajiannya tetap sama.

## Menangani Kegagalan

Object storage menambah panggilan jaringan yang bisa timeout atau ditolak, jadi tiap fetch meneruskan kegagalannya ke [penanganan error terpusat](/id/error-handling/object-details) alih-alih membocorkan error mentah. Objek yang hilang dipetakan ke **404**, sementara gangguan upstream dipetakan ke **502** agar penyebabnya tetap terbaca:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const endpoint: string
// ---cut---
export async function GET(ctx: Context): Promise<Response> {
  const key = ctx.get.param('key')
  try {
    const object = await fetch(`${endpoint}/${key}`)
    if (object.status === 404) {
      return await ctx.handleError(404, new Deno.errors.NotFound('Object not found'))
    }
    // Petakan kegagalan upstream ke 502
    if (!object.ok || !object.body) {
      return await ctx.handleError(502, new Error('Object storage unavailable'))
    }
    return ctx.send.custom(object.body, {
      headers: {
        'Content-Type': 'application/octet-stream'
      }
    })
  } catch (error) {
    // Rutekan tiap gangguan jaringan ke error handling
    return await ctx.handleError(502, error as Error)
  }
}
```

Membentuk ini menjadi satu response klien tinggal di [Penanganan Error](/id/error-handling/object-details), dan menangkapnya untuk log tinggal di [Pelaporan Error](/id/middleware/observability/errors).
