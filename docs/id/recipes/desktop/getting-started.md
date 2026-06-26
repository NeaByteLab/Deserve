---
description: 'Menyiapkan blok desktop di deno.json, mengompilasi server Deserve menjadi bundle native, menyematkan route dan view, serta meresolusi jalur template terhadap bundle alih-alih direktori kerja.'
---

# Membangun Aplikasi

> **Referensi**: [Deno Desktop CLI](https://docs.deno.com/runtime/desktop/)

Sebuah build desktop berangkat dari proyek Deserve biasa, jenis yang dari [Mulai Cepat](/id/getting-started/quick-start), lalu menambahkan blok `desktop` ke `deno.json` plus beberapa flag build. Kode server tetap sama. Langkah kompilasi memanggang server itu, route, view, dan backend rendering menjadi satu bundle aplikasi.

## Blok Desktop

Konfigurasi untuk `deno desktop` tinggal di blok `desktop` di dalam `deno.json`. Blok minimal menamai aplikasi dan memilih backend rendering, sementara field `name` dan `version` di akar memberi metadata bundle:

```json
{
  "name": "deserve-desktop",
  "version": "0.1.0",
  "imports": {
    "@neabyte/deserve": "jsr:@neabyte/deserve@0.15.0"
  },
  "desktop": {
    "app": {
      "name": "Deserve Desktop",
      "identifier": "com.example.deservedesktop"
    },
    "backend": "webview"
  }
}
```

`app.identifier` adalah string reverse-DNS. Ia memberi id bundle macOS, entri desktop Linux, dan id aplikasi Windows, dan nilai stabil di sini adalah yang membuat [notifikasi](/id/recipes/desktop/notifications-updates#notifikasi) bisa meminta izin. Pilihan `backend` dan sisa blok dibahas di [Backend dan Distribusi](/id/recipes/desktop/distribution).

## Mendefinisikan Task

Sebuah [`deno task`](https://docs.deno.com/runtime/reference/cli/task/) menyimpan perintah build yang panjang. Flag `--include` paling penting, karena folder route dan view dibaca saat runtime dan harus ikut di dalam bundle:

```json
{
  "tasks": {
    "desktop": "deno desktop --allow-net --allow-read --allow-env --allow-write --include routes --include views main.ts"
  }
}
```

Tiap flag izin terbawa ke dalam bundle, himpunan yang sama dengan yang dipakai [deploy produksi](/id/recipes/production-deploy#daftar-periksa-permission). Menjalankan `deno task desktop` lalu mengompilasi aplikasi untuk platform host.

## Menyematkan Route dan View

Tanpa `--include`, langkah kompilasi memanggang `main.ts` dan modul yang diimpornya, tetapi bukan folder route dan view yang dibaca Deserve dari disk saat request. Keluaran build menampilkan apa yang masuk:

```
Embedded Files
DeserveDesktop.dylib
├── main.ts
├── routes/*
└── views/*
```

Saat route dan view tidak ada di daftar itu, aplikasi yang berjalan menjawab tiap request dengan 404, karena router memindai folder kosong. Menambahkan `--include routes --include views` menaruh kedua folder di filesystem virtual yang disematkan, tempat router menemukannya saat runtime.

## Jebakan Direktori Kerja

Bundle terkompilasi berjalan dengan direktori kerja diatur ke tempat pengguna meluncurkannya, bukan folder yang menampung binary. Jalur relatif seperti `./routes` lalu meresolusi terhadap lokasi pengguna dan menunjuk ke ketiadaan. Halaman merender 404 meski folder sudah disematkan.

Perbaikannya menambatkan jalur ke modul alih-alih ke direktori kerja. [`import.meta.dirname`](https://docs.deno.com/api/web/~/ImportMeta) menyimpan folder absolut dari modul saat ini, jadi menggabungkan folder route dan view ke sana meresolusi dengan cara yang sama di host maupun di dalam bundle:

```typescript twoslash
import { Router } from '@neabyte/deserve'

// Tambatkan jalur ke folder modul ini
const base = import.meta.dirname

const router = new Router({
  routes: { directory: `${base}/routes` },
  views: { directory: `${base}/views` }
})

await router.serve(8000, '127.0.0.1')
```

Mengikat `127.0.0.1` menjaga server pada loopback, satu-satunya antarmuka yang dibutuhkan aplikasi desktop. Argumen port adalah titik awal, karena runtime desktop memberi server port miliknya sendiri, detail yang dibahas di [Menyajikan UI](/id/recipes/desktop/serving#menemukan-port).

## Jalan Pertama

Setelah `deno task desktop` selesai, bundle mendarat di samping proyek. Meluncurkannya membuka jendela dan halaman dimuat dari server yang disematkan:

```bash
# Buka bundle yang baru dibangun
open "Deserve Desktop.app"
```

File entry yang sama juga berjalan di host dengan `deno run`, karena bagian native tetap diam saat tidak ada jendela. Jalur ganda itulah yang diandalkan [penjaga API native](/id/recipes/desktop/native-apis#tetap-dwi-mode), dan itu menjaga pengembangan berbasis browser tetap cepat sementara build desktop tinggal satu perintah saja.
