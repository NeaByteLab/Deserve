# Beberapa Direktori

Sajikan file statis dari beberapa direktori dengan konfigurasi berbeda per path.

## Penggunaan Dasar

Konfigurasi beberapa direktori statis:

```typescript
import { Router } from '@neabyte/deserve'

const router = new Router()

// File statis admin panel
router.static('/admin', {
  path: './admin/dist',
  etag: true,
  cacheControl: 86400
})

// Upload user
router.static('/uploads', {
  path: './uploads',
  etag: false,
  cacheControl: 0
})

// Dokumentasi API
router.static('/docs', {
  path: './docs/build',
  etag: true,
  cacheControl: 3600
})

await router.serve(8000)
```

## Pola Umum

### Website + Admin Panel

```typescript
// Website utama
router.static('/', {
  path: './public',
  etag: true,
  cacheControl: 86400
})

// Admin panel
router.static('/admin', {
  path: './admin/dist',
  etag: true,
  cacheControl: 86400
})
```

### Assets + Uploads

```typescript
// Static assets dengan cache jangka panjang
router.static('/assets', {
  path: './public/assets',
  etag: true,
  cacheControl: 31536000 // 1 tahun
})

// User uploads tanpa cache
router.static('/uploads', {
  path: './uploads',
  etag: false,
  cacheControl: 0 // No cache
})
```

### Development + Production

```typescript
// File development - cache pendek
router.static('/dev', {
  path: './dev',
  etag: true,
  cacheControl: 0 // No cache untuk dev
})

// Production build - cache panjang
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

```typescript
// Assets dengan cache jangka panjang (1 tahun)
router.static('/assets', {
  path: './public/assets',
  etag: true,
  cacheControl: 31536000
})

// Cache menengah (1 hari)
router.static('/images', {
  path: './public/images',
  etag: true,
  cacheControl: 86400
})

// No caching untuk upload dinamis
router.static('/uploads', {
  path: './uploads',
  etag: false,
  cacheControl: 0
})
```

### Pengaturan ETag Berbeda

```typescript
// Aktifkan ETag untuk caching efisien
router.static('/static', {
  path: './public',
  etag: true,
  cacheControl: 86400
})

// Nonaktifkan ETag untuk file yang sering berubah
router.static('/reports', {
  path: './reports',
  etag: false,
  cacheControl: 3600
})
```

## Troubleshooting

### Konflik Route

Routes diregistrasi untuk semua HTTP methods (`GET`, `POST`, dll.). Pastikan static routes tidak konflik dengan dynamic routes:

```typescript
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

