---
description: 'Membungkus server Deserve dalam jendela desktop native dengan deno desktop, di mana framework menyajikan UI lewat HTTP lokal dan runtime menangani jendela, menu, serta tray.'
---

# Ringkasan Deno Desktop

> **Referensi**: [Deno Desktop](https://docs.deno.com/runtime/desktop/)

Sebuah build desktop mengambil server Deserve, route dan view yang sama yang berjalan di host, lalu membungkusnya dalam jendela native. [`deno desktop`](https://docs.deno.com/runtime/desktop/) mengompilasi server beserta backend rendering menjadi satu bundle aplikasi, kemudian saat diluncurkan ia menjalankan server pada port loopback lokal dan mengarahkan webview ke sana. Jendela menampilkan halaman web biasa, halaman berbicara ke server lewat HTTP, dan server menjangkau disk serta OS melalui Deno.

Inilah gambaran yang perlu dipegang sepanjang seri ini:

```
DeserveDesktop.app (satu bundle)
├── webview            → merender halaman, menjalankan JS browser
└── deno + deserve     → router.serve() di 127.0.0.1:<port>
        routes/*       → handler GET, POST
        views/*        → template DVE
```

Frontend dan backend tinggal dalam proses yang sama dan file yang sama. Server hanya mengikat loopback, jadi tidak ada apa pun di luar mesin yang bisa menjangkaunya. Hasilnya terbaca seperti aplikasi web dari dalam dan aplikasi native dari luar.

`deno desktop` tersedia mulai Deno **2.9.0** dan ditandai eksperimental, jadi permukaan API bisa bergeser antar rilis.

## Mengapa Deserve Cocok

Aplikasi desktop tetap butuh routing, view engine, penanganan request, dan jalur error. Deserve sudah menyediakan semua itu, jadi build desktop memakai ulang server tanpa perubahan. [Router](/id/getting-started/server-configuration) menyajikan halaman dan API, [routing berbasis file](/id/core-concepts/file-based-routing) memetakan endpoint, dan [view engine](/id/rendering/) merender HTML. Lapisan native duduk di samping server alih-alih menggantikan bagian mana pun.

Satu detail membentuk segalanya. Halaman dan sisi Deno berbicara lewat API HTTP lokal, transport yang sama yang akan dipakai sebuah browser, yang membuat kode server identik baik berjalan di host maupun di dalam jendela. Alasan di balik pilihan itu ada di [Bindings dan Jembatan HTTP](/id/recipes/desktop/bindings).

## Kompatibilitas Fitur

Sebagian besar permukaan `deno desktop` bekerja lewat Deserve tanpa perubahan. Beberapa item membawa syarat, dan satu tidak cocok dengan framework sama sekali. Tabel ini adalah peta untuk halaman-halaman berikutnya:

| Area               | Bekerja dengan Deserve | Catatan                                                          |
| ------------------ | ---------------------- | --------------------------------------------------------------- |
| Penyajian HTTP     | Ya                     | `router.serve()` mengikat port desktop dengan sendirinya         |
| Rendering view     | Ya                     | `ctx.render()` mengembalikan halaman seperti route mana pun      |
| Jendela            | Ya                     | `BrowserWindow` mengendalikan jendela native                     |
| Menu, tray, dock   | Ya                     | Menu dan tray native duduk di samping server                     |
| Dialog             | Ya                     | `alert`, `confirm`, `prompt` meresolusi secara native            |
| Notifikasi         | Bersyarat              | Butuh bundle bertanda tangan, identifier stabil, peluncuran Finder |
| Auto-update        | Ya                     | `Deno.autoUpdate()` mem-poll server rilis dari sisi Deno         |
| Pelaporan error    | Ya                     | Menangkap error tak tertangkap dan mengirim laporan JSON         |
| Bindings           | Tidak                  | `win.bind()` tidak bertahan pada jalur serve Deserve             |
| DevTools           | Terikat-backend        | Tersedia pada backend CEF, bukan pada webview default            |

## Urutan Membaca

Seri ini bergerak dari build pertama menuju distribusi, dan tiap halaman menautkan ke berikutnya:

- [Membangun Aplikasi](/id/recipes/desktop/getting-started) menyiapkan blok `deno.json`, menyematkan route dan view, serta memperbaiki jebakan direktori kerja.
- [Menyajikan UI](/id/recipes/desktop/serving) membahas cara `router.serve()` menemukan port desktop dan merender halaman.
- [Jendela, Menu, Tray dan Dialog](/id/recipes/desktop/native-apis) merangkai cangkang native di sekitar server.
- [Bindings dan Jembatan HTTP](/id/recipes/desktop/bindings) menjelaskan satu ketidakcocokan dan pola yang menggantikannya.
- [Notifikasi, Auto-update dan Pelaporan Error](/id/recipes/desktop/notifications-updates) membahas layanan runtime.
- [Backend dan Distribusi](/id/recipes/desktop/distribution) menutup dengan pilihan backend, format keluaran, dan kompilasi-silang.
