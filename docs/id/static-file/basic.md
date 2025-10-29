# Penggunaan Dasar Static File

Sajikan file statis (HTML, CSS, JS, images) menggunakan method `static()`.

## Penggunaan Dasar

Sajikan file statis dari direktori:

```typescript
import { Router } from '@neabyte/deserve'

const router = new Router()

router.static('/static', {
  path: './public',
  etag: true,
  cacheControl: 86400
})

await router.serve(8000)
```

Ini menyajikan file dari direktori `public/` di path URL `/static`:
- `GET /static/index.html` → menyajikan `public/index.html`
- `GET /static/css/style.css` → menyajikan `public/css/style.css`
- `GET /static/js/app.js` → menyajikan `public/js/app.js`

## Cara Kerja

Deserve menggunakan implementasi custom untuk menyajikan file statis:

1. **Route Matching**: Membuat routes dengan pola `${urlPath}/**` untuk mencocokkan semua file
2. **File Resolution**: Memetakan URL paths ke file system paths menggunakan opsi `path`
3. **Wildcard Capture**: Mengekstrak path file dari route parameters (`params['_']`)
4. **Priority**: Static routes diregistrasi untuk semua HTTP methods sebelum dynamic routes

## Opsi Static File

Method `static()` menerima objek `ServeOptions`:

### `path`
Path direktori file system untuk menyajikan file:

```typescript
router.static('/static', {
  path: './public' // Sajikan file dari direktori public/
})

router.static('/assets', {
  path: '/absolute/path/to/assets' // Absolute path juga didukung
})
```

### `etag`
Aktifkan generasi ETag untuk caching. Menggunakan algoritma SHA-256:

```typescript
router.static('/static', {
  path: './public',
  etag: true // Generate ETag headers menggunakan SHA-256
})
```

Ketika diaktifkan, Deserve menghasilkan ETag headers dari content hash. Jika client mengirim header `If-None-Match` yang cocok dengan ETag, response `304 Not Modified` dikembalikan.

### `cacheControl`
Set Cache-Control header max-age dalam detik:

```typescript
router.static('/static', {
  path: './public',
  cacheControl: 86400 // Cache selama 1 hari (86400 detik)
})

router.static('/assets', {
  path: './assets',
  cacheControl: 31536000 // Cache selama 1 tahun
})
```

## Troubleshooting

### File Tidak Ditemukan
- Periksa `path` benar (relative ke current working directory atau absolute)
- Verifikasi permission file
- Pastikan file ada di direktori
- Periksa bahwa URL path cocok dengan pola route (`/static/file.css` untuk `router.static('/static', ...)`)

### Error 404
- Verifikasi static route diregistrasi sebelum memanggil `router.serve()`
- Periksa bahwa file paths cocok dengan struktur URL
- Pastikan file ada di path yang di-resolve

### Masalah Caching
- Verifikasi `etag` dan `cacheControl` diatur dengan benar
- Periksa browser DevTools Network tab untuk header ETag dan Cache-Control
- Clear browser cache untuk testing
- Gunakan response `304 Not Modified` (terlihat saat ETag cocok)

