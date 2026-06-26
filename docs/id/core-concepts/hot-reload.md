---
description: "Hot reload di Deserve: cara perubahan rute dan template terdeteksi dan diterapkan tanpa merestart server."
---

# Hot Reload

Deserve otomatis memantau direktori routes dan direktori views untuk perubahan berkas, dan ketika berkas dibuat, diubah, atau dihapus, server menangkap perubahan pada request berikutnya tanpa perlu restart.

## Tanpa Konfigurasi

Hot reload mulai otomatis saat server dimulai, kecuali `hotReload: false` diberikan ke router:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const app = new Router({
  routes: { directory: './routes' },
  views: { directory: './views' }
})

// Watcher mulai otomatis
app.serve(3000)
```

Untuk mematikan hot reload sepenuhnya, set `hotReload: false`. Ini cocok untuk deployment produksi di mana pemantauan berkas tidak diperlukan:

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const app = new Router({
  hotReload: false
})
```

## Apa yang Dipantau

### Berkas Rute

Semua berkas dengan ekstensi yang didukung (`.ts`, `.js`, `.tsx`, `.jsx`, `.mjs`, `.cjs`) di dalam direktori routes dipantau secara rekursif.

| Event             | Perilaku                                                                     |
| ----------------- | ---------------------------------------------------------------------------- |
| **Berkas dibuat** | Modul diimpor dan route handler didaftarkan otomatis                          |
| **Berkas diubah** | Modul baru diimpor dan divalidasi dulu, lalu handler lama diganti, sehingga suntingan yang rusak tetap menyisakan versi baik terakhir yang melayani |
| **Berkas dihapus**| Pola rute dilepas dari router, request mengembalikan 404                     |

### Berkas Template

Semua berkas `.dve` di dalam direktori views dipantau secara rekursif, jadi suntingan [template](/id/rendering/) muncul pada render berikutnya tanpa restart.

| Event             | Perilaku                                                                       |
| ----------------- | ------------------------------------------------------------------------------ |
| **Berkas dibuat** | Path yang ditemukan disegarkan agar template tersedia untuk rendering           |
| **Berkas diubah** | Cache berkas dan cache AST terkompilasi dibersihkan, render berikutnya baca konten segar |
| **Berkas dihapus**| Path yang ditemukan disegarkan, merender template akan melempar error           |

## Isolasi Error

Berkas buruk ditangkap dan tidak pernah membuat server atau rute lain crash. Karena modul baru diimpor dan divalidasi sebelum yang lama dilepas, reload yang gagal membiarkan versi baik sebelumnya tetap di tempatnya alih-alih mematikan rute. Tiap kegagalan muncul sebagai event observability [`route:failed`](/id/middleware/observability/events), jadi logging tinggal di satu tempat dan tidak ada yang tercetak ke konsol sendiri.

![Pandangan abstrak kenapa reload tetap aman, di mana menerapkan perubahan berkas secara live bertumpu pada tiga mekanisme yang berpegangan bersama, mengisolasi tiap berkas dengan try catch agar yang buruk tak pernah membuat yang lain crash, membuang cache modul dengan query timestamp agar kode basi tak pernah mengontaminasi yang baru, dan memuat ulang secara berurutan dengan memvalidasi modul baru lalu menukarnya masuk setelah debounce, yang bersama menghadirkan edit live tanpa downtime, tanpa crash, dan tanpa kontaminasi](/diagrams/hot-reload-principles.png)

### Sintaks Tidak Valid

Sintaks tidak valid menggagalkan impor, jadi pertukaran tak pernah terjadi dan rute baik terakhir tetap melayani. Kegagalan tiba sebagai event `route:failed` yang membawa path rute dan error parse-nya.

### Ekspor Metode HTTP Hilang

Berkas tanpa ekspor metode HTTP yang valid (`GET`, `POST`, dll.) gagal validasi sebelum pertukaran, jadi rute dibiarkan utuh dan alasannya dilaporkan lewat event `route:failed` yang sama.

### Error Runtime di Handler

Ketika handler yang dimuat ulang melempar saat request, [penanganan error terpusat](/id/error-handling/defense-in-depth) mengembalikan response 500 yang benar. Server tetap hidup dan rute lain tak terpengaruh.

## Debouncing

Event sistem berkas di-debounce untuk mencegah reload berlebih selama simpan beruntun:

- **Watcher template**: debounce 100ms, membersihkan hanya entri cache berkas yang berubah
- **Watcher rute**: debounce 150ms, menggabungkan beberapa perubahan berkas jadi satu reload berurutan

Beberapa perubahan berkas dalam jendela debounce digabung jadi satu operasi, menghindari reload berlebih saat menyimpan beberapa berkas sekaligus.

## Cara Kerja

### Memuat Ulang Rute

![Urutan reload rute sebagaimana watcher menjalankannya, di mana watcher mendeteksi perubahan lalu mendebounce 150ms, modul diimpor ulang dengan query timestamp untuk melewati cache, lalu divalidasi punya metode HTTP, dan hanya setelah keduanya lolos pola lama dilepas dan handler baru didaftarkan sambil memancarkan route:updated, dan kegagalan saat impor atau validasi malah memancarkan route:failed sebelum pertukaran apa pun sehingga rute lama tetap melayani dan server tetap hidup](/diagrams/hot-reload-route-sequence.png)

1. Watcher mendeteksi perubahan di direktori routes dan menunggu jendela debounce
2. Path berkas diresolusi ke pola rute
3. Modul diimpor ulang dengan query cache-busting (`?t=timestamp`) untuk melewati cache modul
4. Modul divalidasi punya minimal satu ekspor metode HTTP
5. Hanya setelah impor dan validasi lolos, pola lama dilepas dan handler baru didaftarkan, lalu event `route:updated` menyala
6. Jika langkah mana pun sebelum pertukaran gagal, rute lama dibiarkan melayani dan event `route:failed` menyala sebagai gantinya

### Memuat Ulang Template

1. Watcher mendeteksi perubahan di direktori views dan menunggu jendela debounce
2. Entri AST terkompilasi berkas yang berubah dibersihkan dari cache
3. Set path template yang ditemukan direset
4. Pada panggilan `ctx.render()` berikutnya, mesin membaca ulang berkas dari disk, mengurai ulang, dan menyimpan hasilnya
