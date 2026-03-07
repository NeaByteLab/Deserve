# Penggunaan Dasar Static File

Sajikan file statis (HTML, CSS, JS, images) dari sebuah folder menggunakan method `router.static()`. Request ke path URL yang Anda tentukan akan di-resolve ke file di dalam folder tersebut.

## Penggunaan Dasar

Sajikan file statis dari direktori:

```typescript
// 1. Import Router
import { Router } from '@neabyte/deserve'

// 2. Buat router
const router = new Router()

// 3. Mount static: URL /static → folder ./public, plus ETag & cache
router.static('/static', {
  path: './public',
  etag: true,
  cacheControl: 86400
})

// 4. Jalankan server
await router.serve(8000)
```

Ini menyajikan file dari direktori `public/` di path URL `/static`:

- `GET /static/index.html` → menyajikan `public/index.html`
- `GET /static/css/style.css` → menyajikan `public/css/style.css`
- `GET /static/js/app.js` → menyajikan `public/js/app.js`

## Cara Kerja

Deserve memetakan URL ke file di disk dengan alur berikut:

1. **Route Matching**: Membuat routes dengan pola `${urlPath}/**` untuk mencocokkan semua file
2. **Path Extraction**: Menggunakan `ctx.pathname` langsung untuk mendapatkan full request path (pola `/**` dari FastRouter hanya menangkap segment pertama, jadi kita menggunakan pathname sebagai gantinya)
3. **File Resolution**: Memetakan URL paths ke file system paths menggunakan opsi `path`
4. **Priority**: Static routes diregistrasi untuk semua HTTP methods sebelum dynamic routes

### Perilaku Wildcard Pattern

Ketika `urlPath` adalah `/`, Deserve membuat pola `/**`. Untuk path resolution, Deserve menggunakan `ctx.pathname` daripada mengandalkan wildcard parameter, karena:

- Pola `/**` dari FastRouter hanya menangkap **segment pertama** dari request path alih-alih full path (misalnya, `"styles"` untuk `/styles/ui.css`)
- Untuk menyajikan file nested dengan benar, Deserve mengekstrak full path dari `ctx.pathname` dan menghapus leading `/` untuk mendapatkan relative file path

**Contoh:**

- Request: `GET /styles/ui.css`
- Pattern: `/**` cocok dari path yang dikonfigurasi
- File path: Diekstrak dari `ctx.pathname` → `"styles/ui.css"`
- Resolved: `static/styles/ui.css`

## Opsi Static File

Method `static()` menerima objek `ServeOptions`:

### `path`

Path direktori file system untuk menyajikan file:

```typescript
// 1. Path relatif (dari CWD)
router.static('/static', {
  path: './public'
})

// 2. Path absolut
router.static('/assets', {
  path: '/absolute/path/to/assets'
})
```

### `etag`

Aktifkan generasi ETag untuk caching. Menggunakan algoritma SHA-256:

```typescript
// 1. Aktifkan ETag (SHA-256) untuk 304 Not Modified
router.static('/static', {
  path: './public',
  etag: true
})
```

Ketika diaktifkan, Deserve menghasilkan ETag headers dari content hash. Jika client mengirim header `If-None-Match` yang cocok dengan ETag, response `304 Not Modified` dikembalikan.

### `cacheControl`

Set Cache-Control header max-age dalam detik:

```typescript
// 1. Cache-Control max-age (detik): 1 hari
router.static('/static', {
  path: './public',
  cacheControl: 86400
})

// 2. Cache 1 tahun
router.static('/assets', {
  path: './assets',
  cacheControl: 31536000
})
```

## Pemecahan Masalah

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
