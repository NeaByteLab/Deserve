---
description: "Hot reload di Deserve: cara perubahan rute dan template terdeteksi dan diterapkan tanpa merestart server."
---

# Hot Reload

Deserve otomatis memantau direktori `routesDir` dan `viewsDir` untuk perubahan berkas, dan ketika berkas dibuat, diubah, atau dihapus, server menangkap perubahan pada request berikutnya tanpa perlu restart.

## Tanpa Konfigurasi

Hot reload mulai otomatis saat server dimulai:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const app = new Router({
  routesDir: './routes',
  viewsDir: './views'
})

// Watcher mulai otomatis
app.serve(3000)
```

## Apa yang Dipantau

### Berkas Rute

Semua berkas dengan ekstensi yang didukung (`.ts`, `.js`, `.tsx`, `.jsx`, `.mjs`, `.cjs`) di dalam `routesDir` dipantau secara rekursif.

| Event             | Perilaku                                                                     |
| ----------------- | ---------------------------------------------------------------------------- |
| **Berkas dibuat** | Modul diimpor dan route handler didaftarkan otomatis                          |
| **Berkas diubah** | Handler lama dilepas, modul diimpor ulang, handler baru didaftarkan          |
| **Berkas dihapus**| Pola rute dilepas dari router, request mengembalikan 404                     |

### Berkas Template

Semua berkas `.dve` di dalam `viewsDir` dipantau secara rekursif, jadi suntingan [template](/id/rendering/) muncul pada render berikutnya tanpa restart.

| Event             | Perilaku                                                                       |
| ----------------- | ------------------------------------------------------------------------------ |
| **Berkas dibuat** | Path yang ditemukan disegarkan agar template tersedia untuk rendering           |
| **Berkas diubah** | Cache berkas dan cache AST terkompilasi dibersihkan, render berikutnya baca konten segar |
| **Berkas dihapus**| Path yang ditemukan disegarkan, merender template akan melempar error           |

## Isolasi Error

Berkas buruk ditangkap, dicatat, dan tidak pernah membuat server atau rute lain crash. Tiap kegagalan juga muncul sebagai event observability [`route:error` atau `reload:error`](/id/middleware/observability/events#rute), jadi logging tinggal di satu tempat.

### Sintaks Salah Bentuk

Sintaks tidak valid menggagalkan impor dan mencatat error. Rute lain tetap tak terpengaruh:

```
[Deserve] Failed to reload route malformed.ts: The module's source code
could not be parsed: Expected ';', '}' or <eof> at ...
```

### Ekspor Metode HTTP Hilang

Rute tanpa ekspor metode HTTP yang valid (`GET`, `POST`, dll.) ditolak dan dicatat:

```
[Deserve] Failed to reload route broken.ts: Route "broken.ts" must export
at least one HTTP method (DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT)
```

### Error Runtime di Handler

Jika handler yang dimuat ulang melempar saat request, [penanganan error](/id/error-handling/defense-in-depth) Deserve mengembalikan response 500 yang benar. Server tetap hidup dan rute lain tak terpengaruh.

## Debouncing

Event sistem berkas di-debounce untuk mencegah reload berlebih selama simpan beruntun:

- **Watcher template**: debounce 100ms, membersihkan hanya entri cache berkas yang berubah
- **Watcher rute**: debounce 150ms, menggabungkan beberapa perubahan berkas jadi satu reload berurutan

Beberapa perubahan berkas dalam jendela debounce digabung jadi satu operasi, menghindari reload berlebih saat menyimpan beberapa berkas sekaligus.

## Cara Kerja

### Memuat Ulang Rute

1. `Deno.watchFs` mendeteksi perubahan di `routesDir`
2. Setelah jendela debounce, watcher meresolusi path berkas ke pola rute
3. Pola rute lama dilepas dari router lewat `FastRouter.remove()`
4. Modul diimpor ulang dengan query cache-busting (`?t=timestamp`) untuk melewati cache modul Deno
5. Modul divalidasi dan handler metode HTTP baru didaftarkan

### Memuat Ulang Template

1. `Deno.watchFs` mendeteksi perubahan di `viewsDir`
2. Setelah jendela debounce, watcher membersihkan entri berkas dari `fileCache` (konten mentah) dan `compileCache` (AST terurai)
3. Set path template yang ditemukan direset
4. Pada panggilan `render()` atau `streamRender()` berikutnya, mesin membaca ulang berkas dari disk, mengurai ulang, dan menyimpan hasilnya
