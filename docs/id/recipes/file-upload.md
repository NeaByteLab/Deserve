---
description: 'Terima upload multipart, ambil file dari FormData, dan simpan ke disk di Deserve.'
---

# Upload File

Sebuah upload file hanyalah body request bertipe konten `multipart/form-data`, jadi pembaca [penanganan request](/id/core-concepts/request-handling) yang sama yang mengurai JSON atau teks juga membongkar file yang diunggah. Deserve bersandar pada [Web FormData API](https://developer.mozilla.org/en-US/docs/Web/API/FormData) native, jadi file yang diunggah tiba sebagai objek [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File) standar dengan bytes, nama, dan tipe yang sudah melekat.

## Struktur Proyek

Handler upload tinggal di [direktori routes](/id/core-concepts/file-based-routing) sementara file tersimpan berada di folder `uploads` di sebelahnya yang disajikan kembali oleh [penyajian statis](/id/static-file/multiple). Entri server menyatukan keduanya:

```
.
├── main.ts                  → Setup Router dan serve
├── routes/
│   └── api/
│       └── upload.ts        → POST /api/upload
└── uploads/                 → File tersimpan mendarat di sini
```

## Membaca Upload

Sebuah request multipart mengalir lewat `ctx.formData()`, dan tiap field bernama kembali dari `form.get()`. Field teks mengembalikan string sementara field file mengembalikan `File`:

```typescript twoslash
import type { Context } from '@neabyte/deserve'

// POST /api/upload dengan form multipart
export async function POST(ctx: Context): Promise<Response> {
  const form = await ctx.formData()
  const title = form.get('title') // Field teks sebagai string
  const file = form.get('file') // File atau string atau null

  // Pantulkan kedua jenis field
  return ctx.send.json({
    title,
    filename: file instanceof File ? file.name : null
  })
}
```

Memanggil `ctx.body()` mencapai parser yang sama, karena pembaca itu membaca header `Content-Type` dan mengarahkan baik `multipart/form-data` maupun `application/x-www-form-urlencoded` ke `FormData`. Memilih `ctx.formData()` membuat niat jelas di titik panggilan.

## Memastikan File Tiba

`form.get()` mengembalikan `null` untuk field yang hilang dan string untuk field teks, jadi pengecekan `instanceof File` memisahkan upload nyata dari sisanya sebelum pekerjaan apa pun berjalan:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export async function POST(ctx: Context): Promise<Response> {
  const form = await ctx.formData()
  const file = form.get('file')

  // Tolak saat tidak ada file
  if (!(file instanceof File)) {
    return ctx.send.json(
      {
        error: 'No file uploaded'
      },
      {
        status: 400
      }
    )
  }

  // Metadata ikut bersama File
  return ctx.send.json({
    name: file.name,
    type: file.type,
    size: file.size
  })
}
```

Objek `File` memaparkan `name`, `type`, dan `size` miliknya sendiri, jadi melaporkan kembali sebuah upload tidak pernah perlu menyentuh disk.

Handler yang memeriksa beberapa field bisa memindahkan pemeriksaan itu ke depan dirinya dengan kontrak [validasi](/id/middleware/validation/overview) pada sumber `body`, sehingga hanya request yang sudah membawa field yang benar mencapai handler.

## Menyimpan ke Disk

Bytes tetap di dalam `File` sampai `arrayBuffer()` mengeluarkannya, dan membungkus buffer itu dalam `Uint8Array` memberi [`Deno.writeFile`](https://docs.deno.com/api/deno/~/Deno.writeFile) persis bentuk yang diharapkannya. Deserve tidak pernah menulis upload sendiri, jadi path tujuan tetap dalam kendali penuh:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export async function POST(ctx: Context): Promise<Response> {
  const form = await ctx.formData()
  const file = form.get('file')

  // Tolak saat tidak ada file
  if (!(file instanceof File)) {
    return ctx.send.json(
      {
        error: 'No file uploaded'
      },
      {
        status: 400
      }
    )
  }

  // Baca bytes mentah dari File
  const bytes = new Uint8Array(await file.arrayBuffer())

  // Nama unik mencegah saling timpa
  const path = `./uploads/${crypto.randomUUID()}-${file.name}`
  await Deno.writeFile(path, bytes)

  // Laporkan yang mendarat di disk
  return ctx.send.json({
    saved: file.name,
    size: file.size
  })
}
```

Menulis ke disk butuh izin tulis Deno, jadi server berjalan dengan `--allow-write` atau `--allow-write=./uploads` yang dibatasi untuk folder yang dituju handler.

## Membaca Body Sekali

Tiap Context mengurai body-nya satu kali lalu men-cache hasilnya, jadi pembaca kedua dengan format berbeda pada request yang sama akan melempar error alih-alih mengembalikan data kosong. Memilih salah satu dari `formData()`, `json()`, `text()`, `arrayBuffer()`, atau `blob()` per request menjaga kontrak itu:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export async function POST(ctx: Context): Promise<Response> {
  const form = await ctx.formData() // Body dikonsumsi sekali di sini

  // Baca form ter-cache, bukan body
  return ctx.send.json({
    fields: [...form.keys()]
  })
}
```

Pembaca kedua seperti `ctx.json()` pada request ini akan melempar error alih-alih mengembalikan data kosong, karena body sudah habis. Payload multipart yang rusak juga tidak pernah membuat pipeline crash, karena parser memetakan body rusak ke **400** yang mengalir lewat [penanganan error terpusat](/id/error-handling/object-details). Setiap pembaca dan tipe kembaliannya ada di [referensi penanganan request](/id/core-concepts/request-handling#referensi-method).

## Membatasi Ukuran Upload

`FormData` tidak membatasi berapa banyak bytes yang dikirim klien, jadi rute upload berpasangan dengan [middleware body limit](/id/middleware/body-limit) untuk menolak payload yang terlalu besar dengan **413** sebelum memenuhi memori. `Content-Length` yang diketahui melebihi batas ditolak sebelum body dibaca, sementara stream chunked dipotong begitu bytes berlebih tiba:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router({
  routesDir: './routes'
})

// Batasi rute upload pada 5MB
router.use(
  '/api/upload',
  Mware.bodyLimit({
    limit: 5 * 1024 * 1024
  })
)

await router.serve(8000)
```

## Menyajikan Upload Kembali

File tersimpan di bawah `./uploads` bisa dijangkau lagi lewat [penyajian statis](/id/static-file/multiple), di mana prefix URL memetakan ke folder di disk. Upload pengguna sering berubah, jadi kebijakan `etag: false` dan `cacheControl: 0` menjaga salinan basi keluar dari browser:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Sajikan upload tersimpan tanpa cache
router.static('/uploads', {
  path: './uploads',
  etag: false,
  cacheControl: 0
})
```

Untuk unduhan sekali pakai yang digerakkan handler alih-alih prefix statis, [`ctx.send.file()`](/id/response/file) mengalirkan satu file langsung dari disk dengan `Content-Disposition` yang tepat terpasang.

## Alur Lengkap

Dua file membawa seluruh alur. Entri `main.ts` membatasi ukuran di router dan memaparkan folder tersimpan, sementara file rute di `routes/api/upload.ts` memvalidasi field, menyimpan bytes, dan melaporkan URL publik kembali. Deserve menyatukannya lewat [routing berbasis file](/id/core-concepts/file-based-routing), jadi file rute tidak pernah di-import dengan tangan.

Pertama entri server yang menyiapkan router:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

// Titik masuk main.ts
const router = new Router({
  routesDir: './routes'
})

// Jaga ukuran sebelum handler jalan
router.use(
  '/api/upload',
  Mware.bodyLimit({
    limit: 5 * 1024 * 1024
  })
)

// Sajikan file tersimpan ke klien
router.static('/uploads', {
  path: './uploads',
  etag: false,
  cacheControl: 0
})

await router.serve(8000)
```

Lalu file rute yang menangani upload:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
// Handler routes/api/upload.ts
export async function POST(ctx: Context): Promise<Response> {
  const form = await ctx.formData()
  const file = form.get('file')

  // Tolak saat tidak ada file
  if (!(file instanceof File)) {
    return ctx.send.json(
      {
        error: 'No file uploaded'
      },
      {
        status: 400
      }
    )
  }

  // Baca bytes, lalu tulis nama unik
  const bytes = new Uint8Array(await file.arrayBuffer())
  const name = `${crypto.randomUUID()}-${file.name}`
  await Deno.writeFile(`./uploads/${name}`, bytes)

  // Kembalikan URL unduhan publik
  return ctx.send.json({
    url: `/uploads/${name}`,
    size: file.size
  })
}
```
