---
description: "Sajikan file statis dari sebuah direktori dengan static handler Deserve."
---

# Penyajian Static Dasar

Sajikan file statis (HTML, CSS, JS, images) menggunakan method `static()`.

## Penggunaan Dasar

Sajikan file statis dari direktori:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()

// Sajikan ./public di path /static
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

Deserve memakai implementasi penyajian file statis kustom:

1. **Route Matching**: Membuat route dengan pola `${urlPath}/**` untuk mencocokkan semua file
2. **Path Extraction**: Membaca `ctx.pathname` langsung untuk mendapat full request path, karena pola `/**` FastRouter hanya menangkap segment pertama
3. **File Resolution**: Memetakan path URL ke path file system memakai opsi `path`
4. **Priority**: Static route diregistrasi untuk semua HTTP method sebelum dynamic route

### Perilaku Pola Wildcard

Ketika `urlPath` adalah `/`, Deserve membuat pola `/**`. Untuk path resolution, Deserve memakai `ctx.pathname` daripada mengandalkan parameter wildcard, karena:

- Pola `/**` FastRouter hanya menangkap **segment pertama** dari request path alih-alih full path (misalnya `"styles"` untuk `/styles/ui.css`)
- Untuk menyajikan file bersarang dengan benar, Deserve mengekstrak full path dari `ctx.pathname` dan menghapus `/` awal untuk mendapat path file relatif

**Contoh:**

- Request: `GET /styles/ui.css`
- Pattern: `/**` cocok dari path yang dikonfigurasi
- File path: Diekstrak dari `ctx.pathname` → `"styles/ui.css"`
- Resolved: `static/styles/ui.css`

## Opsi Static File

Method `static()` menerima object `ServeOptions`:

### `path`

Path direktori file system untuk menyajikan file:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
router.static('/static', {
  path: './public' // Sajikan file dari folder public/
})

router.static('/assets', {
  path: '/absolute/path/to/assets' // Path absolut juga didukung
})
```

### `etag`

Aktifkan generasi ETag untuk caching. Tag adalah hash SHA-256 dari ukuran file dan waktu modifikasi, bukan isi file penuh, jadi tetap murah dihitung:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
router.static('/static', {
  path: './public',
  etag: true // Generate ETag dari size dan mtime
})
```

Saat aktif, client yang mengirim header `If-None-Match` yang cocok menerima response `304 Not Modified` tanpa body.

### `cacheControl`

Atur Cache-Control max-age dalam detik. Deserve mengirimnya sebagai `public, max-age=<detik>`, hanya berlaku saat nilainya `0` atau lebih:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
router.static('/static', {
  path: './public',
  cacheControl: 86400 // Cache 1 hari (86400 detik)
})

router.static('/assets', {
  path: './assets',
  cacheControl: 31536000 // Cache 1 tahun
})
```

## Resolusi File dan Keamanan

Penyajian static memetakan path URL ke file di bawah direktori yang dikonfigurasi, dengan beberapa aturan bawaan:

- **Index fallback** - request ke root route menyajikan `index.html` dari direktori.
- **Content type** - tipe dipilih dari ekstensi file. Aset web umum seperti HTML, CSS, JavaScript, JSON, images, fonts, dan dokumen sudah dipetakan langsung, dan ekstensi tidak dikenal jatuh ke `application/octet-stream`.
- **Dotfiles diblokir** - segment path apa pun yang namanya diawali `.` ditolak dengan **404**, jadi file seperti `.env`, `.git/config`, atau `..` di awal tidak pernah disajikan. Aturan melihat nama segment, bukan ekstensi, jadi file biasa seperti `report.env` tetap disajikan.
- **Directory traversal diblokir** - real path hasil resolusi harus tetap di dalam direktori dasar. Path yang lolos keluar, misalnya dibangun dari `..`, ditolak dengan **404**.

File yang hilang atau diblokir mengembalikan 404 lewat [error handler terpusat](/id/error-handling/object-details).

## Pemecahan Masalah

### File Tidak Ditemukan

- Periksa `path` benar (relatif ke current working directory atau absolut)
- Verifikasi permission file
- Pastikan file ada di direktori
- Periksa path URL cocok dengan pola route (`/static/file.css` untuk `router.static('/static', ...)`)

### Error 404

- Verifikasi static route diregistrasi sebelum memanggil `router.serve()`
- Periksa path file cocok dengan struktur URL
- Pastikan file ada di path hasil resolusi

### Masalah Caching

- Verifikasi `etag` dan `cacheControl` diatur dengan benar
- Periksa tab Network di DevTools browser untuk header ETag dan Cache-Control
- Bersihkan cache browser untuk testing
- Pakai response `304 Not Modified` (terlihat saat ETag cocok)
