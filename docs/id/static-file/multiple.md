---
description: "Sajikan aset statis dari beberapa direktori di bawah prefix URL berbeda pada Deserve."
---

# Beberapa Direktori

Beberapa panggilan `router.static()` bisa berjalan berdampingan, masing-masing mengikat satu prefix URL ke foldernya sendiri dengan kebijakan cache sendiri. Opsi dan aturan resolusi per mount dibahas di [Penyajian Static Dasar](/id/static-file/basic), dan halaman ini fokus pada bagaimana banyak mount berbagi satu router.

## Penggunaan Dasar

Pasang tiap prefix dengan folder dan cache-nya sendiri:

![Tiga panggilan static masing-masing mengikat satu prefix url ke foldernya sendiri dengan kebijakan cache sendiri, di mana garis miring admin menyajikan folder admin garis miring dist dengan etag aktif dan cache satu hari, garis miring uploads menyajikan folder uploads dengan etag nonaktif dan tanpa cache, dan garis miring docs menyajikan folder docs garis miring build dengan etag aktif dan cache satu jam](/diagrams/static-multiple-dirs.png)

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()

// Tiap prefix punya folder dan cache sendiri
router.static('/admin', {
  path: './admin/dist',
  etag: true,
  cacheControl: 86400
})
router.static('/uploads', {
  path: './uploads',
  etag: false,
  cacheControl: 0
})
router.static('/docs', {
  path: './docs/build',
  etag: true,
  cacheControl: 3600
})

await router.serve(8000)
```

## Bagaimana Mount Dipilih

Setiap mount masuk ke satu registry yang diurutkan prefix terpanjang dulu. Sebuah request menelusuri daftar itu dan prefix pertama yang mencakup path menang, jadi mount paling spesifik selalu diutamakan atas yang lebih luas:

![Satu request memilih prefix static yang diawalinya, jadi request di bawah garis miring uploads cocok dengan mount garis miring uploads dan disajikan dari folder uploads dengan prefix itu etag nonaktif dan tanpa cache, sementara tail yang sama di bawah garis miring docs malah cocok dengan mount garis miring docs dan disajikan dari docs garis miring build dengan etag aktif dan cache satu jam, membuktikan prefix yang cocok menentukan folder sekaligus kebijakan cache](/diagrams/static-prefix-dispatch.png)

Prefix yang cocok menentukan folder sekaligus kebijakan cache, jadi dua mount bisa berbagi tail path dan tetap meresolusi ke file berbeda. Mount pada `/` duduk di akhir sebagai catch-all yang mencakup apa pun yang tidak dicakup prefix sebelumnya.

## Pola Umum

### Situs Dengan Root Catch-All

Mount `/` yang luas dan mount `/admin` yang fokus hidup berdampingan karena prefix yang lebih panjang dicocokkan lebih dulu. Request ke `/admin/index.html` meresolusi lewat mount admin, sementara `/style.css` jatuh ke mount root:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Panel admin, dicocokkan lebih dulu
router.static('/admin', {
  path: './admin/dist',
  etag: true,
  cacheControl: 86400
})

// Root catch-all, dicocokkan terakhir
router.static('/', {
  path: './public',
  etag: true,
  cacheControl: 86400
})
```

### Aset Berumur Panjang dan Upload Segar

Folder aset ber-fingerprint di-cache selama setahun, sementara folder upload pengguna mematikan cache agar file yang diganti selalu diambil segar:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Aset ber-fingerprint di-cache setahun
router.static('/assets', {
  path: './public/assets',
  etag: true,
  cacheControl: 31536000
})

// Upload pengguna tetap tanpa cache
router.static('/uploads', {
  path: './uploads',
  etag: false,
  cacheControl: 0
})
```

## Struktur Direktori

Sebuah tata letak yang cocok dengan mount di atas:

```
.
├── main.ts
├── public/
│   ├── index.html
│   ├── css/
│   └── js/
├── admin/
│   └── dist/
│       ├── index.html
│       └── assets/
└── uploads/
    ├── images/
    └── documents/
```

## Rute Diprioritaskan

Static mount berjalan hanya setelah dynamic route meleset, jadi sebuah rute selalu menang pada path bersama. Sebuah file route di `/admin` menangani `GET /admin` sebelum static mount `/admin` melihatnya, yang merupakan urutan pencocokan yang dirinci di [Penyajian Static Dasar](/id/static-file/basic#cara-kerja). Jaga API dan folder statis pada prefix berbeda untuk menghindari kejutan:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// API di bawah /api, aset di bawah /static
router.static('/static', {
  path: './public'
})
router.static('/admin', {
  path: './admin/dist'
})
```

## Pemecahan Masalah

- **Folder salah disajikan** - prefix yang lebih luas cocok lebih dulu hanya saat ia memang lebih panjang, jadi pastikan mount spesifik punya prefix yang lebih panjang.
- **Sebuah rute membayangi file** - dynamic route pada path yang sama disajikan sebelum static mount, jadi pindahkan salah satu ke prefix berbeda.
- **404 lintas sebuah mount** - periksa path folder dan bahwa URL mempertahankan prefix mount, karena setiap miss mengembalikan 404 lewat [error handler terpusat](/id/error-handling/object-details).
