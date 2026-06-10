---
description: "Sajikan aset statis dari beberapa direktori di bawah prefix URL berbeda pada Deserve."
---

# Beberapa Direktori

Sajikan file statis dari beberapa direktori dengan konfigurasi berbeda per path. Setiap pemanggilan berbagi opsi dan aturan resolusi yang sama seperti di [Penyajian Static Dasar](/id/static-file/basic).

## Penggunaan Dasar

Konfigurasi beberapa direktori static:

![Tiga panggilan static masing-masing mengikat satu prefix url ke foldernya sendiri dengan kebijakan cache sendiri, di mana garis miring admin menyajikan folder admin garis miring dist dengan etag aktif dan cache satu hari, garis miring uploads menyajikan folder uploads dengan etag nonaktif dan tanpa cache, dan garis miring docs menyajikan folder docs garis miring build dengan etag aktif dan cache satu jam](/diagrams/static-multiple-dirs.png)

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()

// Tiap path punya folder dan cache sendiri
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

## Pola Umum

![Satu request memilih prefix static yang diawalinya, jadi GET garis miring uploads garis miring img garis miring a titik png cocok dengan pola garis miring uploads, prefiksnya dipotong, dan disajikan dari folder uploads dengan etag nonaktif dan tanpa cache, sementara tail yang sama pada GET garis miring docs garis miring img garis miring a titik png malah cocok dengan pola garis miring docs dan disajikan dari docs garis miring build dengan etag aktif dan cache satu jam, membuktikan prefix yang cocok menentukan folder sekaligus kebijakan cache](/diagrams/static-prefix-dispatch.png)

### Website + Panel Admin

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Website utama
router.static('/', {
  path: './public',
  etag: true,
  cacheControl: 86400
})

// Panel admin
router.static('/admin', {
  path: './admin/dist',
  etag: true,
  cacheControl: 86400
})
```

### Aset + Uploads

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Aset statis dengan cache jangka panjang
router.static('/assets', {
  path: './public/assets',
  etag: true,
  cacheControl: 31536000 // 1 tahun
})

// Upload pengguna tanpa cache
router.static('/uploads', {
  path: './uploads',
  etag: false,
  cacheControl: 0 // Tanpa cache
})
```

### Development + Production

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// File development - cache pendek
router.static('/dev', {
  path: './dev',
  etag: true,
  cacheControl: 0 // Tanpa cache untuk dev
})

// Build production - cache panjang
router.static('/', {
  path: './dist',
  etag: true,
  cacheControl: 31536000 // 1 tahun
})
```

## Contoh Struktur Direktori

### Aplikasi Full-Stack

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
├── uploads/
│   ├── images/
│   └── documents/
└── docs/
    └── build/
        ├── index.html
        └── assets/
```

### Frontend Microservices

```
.
├── main.ts
├── web/
│   └── dist/
├── api/
│   └── docs/
├── admin/
│   └── build/
└── mobile/
    └── public/
```

## Contoh Konfigurasi

### Strategi Caching Berbeda

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Aset cache jangka panjang (1 tahun)
router.static('/assets', {
  path: './public/assets',
  etag: true,
  cacheControl: 31536000
})

// Cache jangka menengah (1 hari)
router.static('/images', {
  path: './public/images',
  etag: true,
  cacheControl: 86400
})

// Tanpa cache untuk upload dinamis
router.static('/uploads', {
  path: './uploads',
  etag: false,
  cacheControl: 0
})
```

### Pengaturan ETag Berbeda

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Aktifkan ETag untuk caching efisien
router.static('/static', {
  path: './public',
  etag: true,
  cacheControl: 86400
})

// Matikan ETag untuk file yang sering berubah
router.static('/reports', {
  path: './reports',
  etag: false,
  cacheControl: 3600
})
```

## Pemecahan Masalah

### Konflik Route

Route diregistrasi untuk semua HTTP method (`GET`, `POST`, dll.). Pastikan static route tidak bentrok dengan dynamic route:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
router.static(
  '/',
  {
    path: './public'
  }
)
router.static(
  '/admin',
  {
    path: './admin/dist'
  }
)
```

### File Tidak Ditemukan

- Periksa nilai `path` benar (relatif ke cwd atau absolut)
- Verifikasi struktur direktori cocok dengan konfigurasi
- Pastikan file ada di direktori yang ditentukan
- Periksa path URL cocok dengan pola route

### Masalah Performa

- Aktifkan `etag: true` untuk caching efisien
- Atur nilai `cacheControl` sesuai tipe konten
- Aset statis: cache panjang (31536000 = 1 tahun)
- Konten dinamis: cache pendek atau tanpa cache (0 atau 3600)
