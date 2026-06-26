---
description: "Sajikan file statis dari sebuah direktori dengan static handler Deserve."
---

# Penyajian Static Dasar

Method `router.static()` menyajikan file dari sebuah folder di bawah prefix URL, dengan caching, byte range, dan keamanan path bawaan. Cara ini mencakup HTML, CSS, JavaScript, gambar, font, dan aset lain di disk.

## Penggunaan Dasar

Pasang sebuah folder di bawah prefix URL:

![Sebuah request ke garis miring static garis miring css garis miring style titik css cocok dengan mount garis miring static, prefix garis miring static-nya dipotong menjadi css garis miring style titik css, dan disajikan dari folder public, sementara request ke garis miring static garis miring titik env ditolak dengan 404 sebelum pembacaan apa pun karena segmennya diawali titik](/diagrams/static-url-to-file.png)

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()

// Sajikan ./public di bawah prefix /static
router.static('/static', {
  path: './public',
  etag: true,
  cacheControl: 86400
})

await router.serve(8000)
```

Mount itu memetakan setiap URL di bawah `/static` ke sebuah file di `public/`:

- `GET /static/index.html` menyajikan `public/index.html`
- `GET /static/css/style.css` menyajikan `public/css/style.css`
- `GET /static/.env` ditolak dengan **404** sebelum pembacaan apa pun

## Cara Kerja

Sebuah static mount bukan file route. Ia adalah registry terpisah yang diperiksa router hanya setelah dynamic route meleset, jadi urutan pencocokannya tetap:

1. Entry middleware berjalan lebih dulu.
2. Sebuah dynamic route yang cocok menangani request dan static tidak pernah berjalan.
3. Saat path cocok dengan sebuah rute di bawah method lain, router membalas **405 Method Not Allowed** dengan header `Allow`, dan static tetap tidak pernah berjalan.
4. Tanpa kecocokan rute sama sekali, router menelusuri static mount dan menyajikan yang pertama yang prefix-nya mencakup path.

Sebuah request mempertahankan prefix-nya sampai sebuah mount cocok, lalu prefix dipotong dan sisanya menjadi path file di bawah folder. Jadi `GET /static/css/style.css` memotong `/static` dan meresolusi `css/style.css` di dalam `public/`.

### Pencocokan Prefix

Mount diurutkan prefix terpanjang dulu, jadi yang paling spesifik menang. Mount pada `/admin/assets` dicoba sebelum mount pada `/admin`, yang membuat fallback luas dan folder fokus hidup berdampingan. Mount pada `/` bertindak sebagai catch-all yang mencakup setiap path tersisa. Beberapa mount dan urutan dispatch-nya ada di [Banyak Direktori](/id/static-file/multiple).

### Method yang Didukung

Sebuah static mount menjawab `GET` dan `HEAD` saja. Method lain apa pun pada path yang dicakup mount mengembalikan **405 Method Not Allowed** dengan `Allow: GET, HEAD`. Sebuah request `HEAD` menjalankan jalur yang sama dengan `GET` dan mengembalikan header dengan body kosong.

## Opsi Static File

Argumen kedua adalah object `ServeOptions`. Hanya `path` yang wajib:

### `path`

Direktori filesystem untuk menyajikan, relatif ke current working directory atau absolut. Path kosong melempar saat mount:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
router.static('/static', {
  path: './public' // Sajikan file dari folder public
})

router.static('/assets', {
  path: '/absolute/path/to/assets' // Path absolut juga bisa
})
```

### `etag`

Mengaktifkan pembuatan ETag, dan default aktif saat dihilangkan. Tag adalah validator lemah yang dibangun dari hash SHA-256 ukuran file dan waktu modifikasi, bukan isi file, jadi tetap murah dihitung:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
router.static('/static', {
  path: './public',
  etag: true // Bangun ETag dari size dan mtime
})
```

Saat client mengirim `If-None-Match` yang cocok, response-nya **304 Not Modified** tanpa body. Client yang mengirim `If-Modified-Since` mendapat 304 yang sama saat file tidak lebih baru dari tanggal itu.

### `cacheControl`

Mengatur `Cache-Control` max-age dalam detik, dikirim sebagai `public, max-age=<detik>`. Berlaku hanya saat nilainya `0` atau lebih, dan dihilangkan selain itu:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
router.static('/static', {
  path: './public',
  cacheControl: 86400 // Cache selama satu hari
})

router.static('/assets', {
  path: './assets',
  cacheControl: 31536000 // Cache selama satu tahun
})
```

## Handler Kustom

Sebagai ganti opsi, `static()` menerima sebuah fungsi berbentuk `(ctx, urlPath) => Response`. Fungsi itu menerima [context](/id/core-concepts/context-object) dan path dengan prefix mount yang sudah dipotong, yang cocok untuk peta aset in-memory atau file yang dihasilkan:

```typescript twoslash
import { Router, type Context } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Sajikan aset dari peta berdasarkan path terpotong
router.static('/cdn', (ctx: Context, urlPath: string) => {
  const assets: Record<string, string> = { 'logo.svg': '<svg></svg>' }
  const body = assets[urlPath]
  if (body === undefined) {
    return ctx.send.empty(404)
  }
  return ctx.send.custom(body, { headers: { 'Content-Type': 'image/svg+xml' } })
})
```

## Permintaan Byte-Range

Response statis mendukung satu [byte range](https://www.rfc-editor.org/rfc/rfc7233) sehingga klien bisa mengambil sebagian berkas, yang diandalkan oleh penggeser video atau unduhan yang bisa dilanjutkan. Setiap response statis mengumumkan `Accept-Ranges: bytes`:

- Satu range valid mengembalikan **206 Partial Content** dengan `Content-Range: bytes start-end/size`, mengalirkan hanya byte itu dari disk.
- Range melewati ukuran berkas mengembalikan **416 Range Not Satisfiable** dengan `Content-Range: bytes */size`.
- Range yang tidak ada, multi-bagian, atau malformed kembali menyajikan berkas penuh.

Header `If-Range` yang membawa tanggal mempertahankan range hanya saat berkas tidak berubah, selain itu berkas penuh dikirim. `If-Range` yang membawa entity tag diperlakukan sebagai basi, jadi berkas penuh dikirim. Handle berkas dilepas begitu jendela terkirim, error, atau dibatalkan.

## Resolusi File dan Keamanan

Sebuah mount memetakan URL ke file di bawah folder-nya dengan beberapa aturan tetap:

- **Index fallback** - request ke root mount menyajikan `index.html` dari folder.
- **Content type** - tipe berasal dari ekstensi file. Aset web umum seperti HTML, CSS, JavaScript, JSON, gambar, font, dan dokumen sudah dipetakan langsung, dan ekstensi tidak dikenal memakai `application/octet-stream`.
- **Dotfiles diblokir** - segmen path apa pun yang namanya diawali `.` ditolak dengan **404**, jadi `.env`, `.git/config`, atau `..` di awal tidak pernah disajikan. Aturan membaca nama segmen, bukan ekstensi, jadi file biasa seperti `report.env` tetap disajikan.
- **Traversal diblokir** - real path hasil resolusi harus tetap di dalam folder. Path yang lolos keluar lewat `..` atau symlink ditolak dengan **404**.

Sebuah miss atau path yang diblokir memancarkan event `static:missing` di [bus observability](/id/middleware/observability/overview) dan mengembalikan **404** lewat [error handler terpusat](/id/error-handling/object-details), handler yang sama yang diatur dengan `router.catch()` yang membentuk setiap error lain. Tidak ada hook error per-mount, jadi satu handler mencakup static, rute, dan middleware sekaligus.

## Pemecahan Masalah

Beberapa miss umum dan apa yang perlu diperiksa:

- **404 pada file yang ada** - pastikan `path` menunjuk folder yang benar dan URL mempertahankan prefix mount, jadi `/static/app.css` untuk mount pada `/static`.
- **404 pada dotfile** - ini disengaja, karena segmen apa pun yang diawali `.` diblokir.
- **Sebuah rute menang atas file statis** - dynamic route pada path yang sama diprioritaskan, jadi ganti nama salah satu atau pindahkan static mount ke prefix yang berbeda.
- **Caching tidak diterapkan** - periksa header `ETag` dan `Cache-Control` di panel network browser, dan pastikan `etag` serta `cacheControl` diatur.
