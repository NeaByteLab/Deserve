# Beberapa Direktori Static

Anda bisa memanggil `router.static()` lebih dari sekali untuk menyajikan file dari beberapa folder. Setiap panggilan memetakan satu prefix URL ke satu folder dengan opsi (etag, cache) sendiri.

## Penggunaan Dasar

Konfigurasi beberapa direktori statis:

```typescript
// 1. Import Router
import { Router } from '@neabyte/deserve'

// 2. Buat router
const router = new Router()

// 3. Mount beberapa direktori: URL prefix → path, etag, cache
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

// 4. Jalankan server
await router.serve(8000)
```

## Pola Umum

### Website Dan Admin Panel

```typescript
// 1. Root: public; 2. /admin: admin/dist
router.static('/', {
  path: './public',
  etag: true,
  cacheControl: 86400
})
router.static('/admin', {
  path: './admin/dist',
  etag: true,
  cacheControl: 86400
})
```

### Assets Dan Uploads

```typescript
// 1. Assets: cache panjang (1 tahun)
router.static('/assets', {
  path: './public/assets',
  etag: true,
  cacheControl: 31536000
})

// 2. Uploads: no cache
router.static('/uploads', {
  path: './uploads',
  etag: false,
  cacheControl: 0
})
```

### Development Dan Production

```typescript
// 1. Dev: no cache
router.static('/dev', {
  path: './dev',
  etag: true,
  cacheControl: 0
})

// 2. Production: cache 1 tahun
router.static('/', {
  path: './dist',
  etag: true,
  cacheControl: 31536000
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

```typescript
// 1. Assets: cache 1 tahun
router.static('/assets', {
  path: './public/assets',
  etag: true,
  cacheControl: 31536000
})

// 2. Images: cache 1 hari
router.static('/images', {
  path: './public/images',
  etag: true,
  cacheControl: 86400
})

// 3. Uploads: no cache
router.static('/uploads', {
  path: './uploads',
  etag: false,
  cacheControl: 0
})
```

### Pengaturan ETag Berbeda

```typescript
// 1. ETag on: cocok untuk file jarang berubah
router.static('/static', {
  path: './public',
  etag: true,
  cacheControl: 86400
})

// 2. ETag off: file sering berubah
router.static('/reports', {
  path: './reports',
  etag: false,
  cacheControl: 3600
})
```

## Pemecahan Masalah

### Konflik Route

Routes diregistrasi untuk semua HTTP methods (`GET`, `POST`, dll.). Pastikan static routes tidak konflik dengan dynamic routes:

```typescript
// 1. Urutan mount: pastikan tidak konflik dengan dynamic routes
router.static('/', { path: './public' })
router.static('/admin', { path: './admin/dist' })
```

### File Tidak Ditemukan

- Periksa nilai `path` benar (relative ke cwd atau absolute)
- Verifikasi struktur direktori cocok dengan konfigurasi
- Pastikan file ada di direktori yang ditentukan
- Periksa URL paths cocok dengan pola route

### Masalah Performa

- Aktifkan `etag: true` untuk caching efisien
- Set nilai `cacheControl` yang sesuai berdasarkan tipe konten
- Static assets: cache panjang (31536000 = 1 tahun)
- Konten dinamis: cache pendek atau no cache (0 atau 3600)
