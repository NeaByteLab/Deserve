# Hot Reload

> [!WARNING]
> Fitur ini masih dalam tahap pengembangan dan belum dirilis secara resmi.

Deserve secara otomatis memantau direktori `routesDir` dan `viewsDir` untuk perubahan file. Ketika sebuah file dibuat, diubah, atau dihapus, server langsung menerapkan perubahan pada request berikutnya tanpa perlu restart.

## Tanpa Konfigurasi

Hot reload berjalan otomatis saat server dimulai:

```typescript
import { Router } from '@neabyte/deserve'

const app = new Router({
  routesDir: './routes',
  viewsDir: './views'
})

// Watcher berjalan otomatis
app.serve(3000)
```


## Yang Dipantau

### File Rute

Semua file dengan ekstensi yang didukung (`.ts`, `.js`, `.tsx`, `.jsx`, `.mjs`, `.cjs`) di dalam `routesDir` dipantau secara rekursif.

| Event | Perilaku |
| --- | --- |
| **File dibuat** | Modul diimpor dan route handler didaftarkan secara otomatis |
| **File diubah** | Handler lama dihapus, modul diimpor ulang, handler baru didaftarkan |
| **File dihapus** | Pola rute dihapus dari router, request mengembalikan 404 |

### File Template

Semua file `.dve` di dalam `viewsDir` dipantau secara rekursif.

| Event | Perilaku |
| --- | --- |
| **File dibuat** | Path template yang ditemukan di-refresh sehingga template tersedia untuk rendering |
| **File diubah** | Cache file dan cache AST yang dikompilasi dihapus, render berikutnya membaca konten terbaru |
| **File dihapus** | Path template di-refresh, rendering template tersebut akan menghasilkan error |

## Isolasi Error

File yang bermasalah ditangkap, dicatat di log, dan tidak pernah menyebabkan crash pada server maupun rute lainnya.

### Syntax Tidak Valid

Syntax yang salah akan gagal saat impor dan error dicatat di log. Rute lain tetap berjalan normal:

```
[Deserve] Failed to reload route malformed.ts: The module's source code
could not be parsed: Expected ';', '}' or <eof> at ...
```

### Tidak Ada Export HTTP Method

Rute tanpa export HTTP method yang valid (`GET`, `POST`, dll.) ditolak dan dicatat di log:

```
[Deserve] Failed to reload route broken.ts: Route "broken.ts" must export
at least one HTTP method (DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT)
```

### Error Runtime di Handler

Jika handler yang dimuat ulang menghasilkan error saat request, penanganan error Deserve mengembalikan response 500 yang sesuai. Server tetap berjalan dan rute lain tidak terpengaruh.

## Debouncing

Event file system di-debounce untuk mencegah reload berlebihan saat penyimpanan cepat:

- **Watcher template**: debounce 100ms, hanya menghapus cache file yang berubah
- **Watcher rute**: debounce 150ms, menggabungkan beberapa perubahan file menjadi satu reload berurutan

Beberapa perubahan file dalam jendela debounce digabungkan menjadi satu operasi, menghindari reload berlebihan saat menyimpan beberapa file sekaligus.

## Cara Kerjanya

### Reload Rute

1. `Deno.watchFs` mendeteksi perubahan di `routesDir`
2. Setelah jendela debounce, watcher menentukan path file ke pola rute
3. Pola rute lama dihapus dari router melalui `FastRouter.remove()`
4. Modul diimpor ulang dengan query string cache-busting (`?t=timestamp`) untuk melewati cache modul Deno
5. Modul divalidasi dan handler HTTP method baru didaftarkan

### Reload Template

1. `Deno.watchFs` mendeteksi perubahan di `viewsDir`
2. Setelah jendela debounce, watcher menghapus entri file dari `fileCache` (konten mentah) dan `compileCache` (AST hasil parsing)
3. Set path template yang ditemukan di-reset
4. Pada pemanggilan `render()` atau `streamRender()` berikutnya, engine membaca ulang file dari disk, melakukan parsing ulang, dan menyimpan hasilnya ke cache
