---
description: 'Memunculkan notifikasi native lewat Web Notifications API, mem-poll server rilis dengan Deno.autoUpdate, dan menangkap error tak tertangkap dengan alert native serta laporan JSON, semuanya dari sisi Deno aplikasi desktop Deserve.'
---

# Notifikasi, Auto-update dan Pelaporan Error

> **Referensi**: [Notifikasi Deno Desktop](https://docs.deno.com/runtime/desktop/notifications/)

Tiga layanan runtime tinggal di sisi Deno sebuah bundle desktop dan tak butuh rangkaian khusus untuk bekerja di balik Deserve. Notifikasi menjangkau OS lewat Web API standar, updater mem-poll server rilis, dan pelapor error menangkap apa pun yang lolos dari handler. Tiap layanan berjalan dari sebuah route atau dari penyiapan native, karena keduanya berbagi izin Deno yang sama.

## Notifikasi

Bundle desktop mengimplementasikan [Web Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notification), jadi konstruktor `Notification` yang sama yang dipakai browser menampilkan notifikasi OS native. Konstruktor hanya terdefinisi di dalam bundle, tak terdefinisi di `deno run` biasa:

```typescript twoslash
// Tampilkan notifikasi OS native
const notification = new Notification('Build complete', {
  body: 'The bundle is ready.'
})
notification.onclick = () => console.log('clicked')
```

### Alur Izin

Notifikasi digerbangi izin OS, sama seperti di web. `Notification.permission` membaca status tercache, dan `requestPermission()` meminta saat pertama kali pengguna belum memutuskan:

```typescript twoslash
// Minta izin sebelum memberi notifikasi
let permission = Notification.permission
if (permission !== 'granted') {
  permission = await Notification.requestPermission()
}

if (permission === 'granted') {
  new Notification('All set', { body: 'Notifications are on.' })
}
```

### Syarat di macOS

macOS hanya memberi izin notifikasi pada aplikasi dengan identitas kode stabil. Tiga syarat harus terpenuhi:

- Bundle bertanda tangan kode, yang disediakan `deno desktop` lewat [tanda tangan ad-hoc](/id/recipes/desktop/distribution#penandatanganan-kode) secara default.
- `app.identifier` yang stabil, string reverse-DNS yang diatur di [Membangun Aplikasi](/id/recipes/desktop/getting-started#blok-desktop).
- Peluncuran dari Finder, karena menjalankan binary dalam secara langsung tidak mendaftarkan identitas aplikasi. Luncurkan bundle dengan `open` sebagai gantinya.

Saat itu terpenuhi, prompt izin muncul dan notifikasi tampil. Jalankan binary yang sama langsung dari terminal dan permintaan mengembalikan `denied`, yang merupakan batas konteks-peluncuran OS alih-alih masalah Deserve.

### Memunculkan Dari Route

Halaman memicu notifikasi dengan memanggil route API, [jembatan HTTP](/id/recipes/desktop/bindings#halaman-ke-deno-lewat-http) yang sama yang dipakai di mana-mana. Route memunculkan notifikasi di sisi Deno dan melaporkan hasilnya:

```typescript twoslash
import type { Context } from '@neabyte/deserve'

// routes/api/notify.ts
export async function GET(ctx: Context): Promise<Response> {
  if (typeof Notification === 'undefined') {
    // Bukan bundle desktop
    return ctx.send.json({ ok: false, reason: 'not desktop' })
  }
  let permission = Notification.permission
  if (permission !== 'granted') {
    permission = await Notification.requestPermission()
  }
  if (permission !== 'granted') {
    return ctx.send.json({ ok: false, permission })
  }
  // Munculkan notifikasi native
  new Notification('Deserve Desktop', { body: 'Saved.' })
  return ctx.send.json({ ok: true })
}
```

### Ikon

Spesifikasi mengetik `icon` sebagai string URL, dan runtime hanya meresolusi URL `data:` secara sinkron. Ikon `https:` atau `file:` melintas bolak-balik lewat properti tetapi tidak menampilkan gambar. File di disk harus dibaca dan dienkode menjadi URL `data:` lebih dulu:

```typescript twoslash
// Baca file ikon sebagai byte mentah
const iconBytes = await Deno.readFile('./icon.png')
// Enkode byte menjadi string base64
const base64 = btoa(String.fromCharCode(...iconBytes))
const iconDataUrl = `data:image/png;base64,${base64}`
new Notification('Heads up', { icon: iconDataUrl })
```

Untuk ikon lebih besar, panggilan spread menabrak batas argumen, jadi loop berpotongan atas `iconBytes` yang membangun string biner adalah bentuk aman. Helper [encodeBase64](https://jsr.io/@std/encoding/doc/base64) dari pustaka standar menangani detail itu dalam satu panggilan.

## Auto-update

[`Deno.autoUpdate()`](https://docs.deno.com/api/deno/~/Deno.autoUpdate) mengirim pembaruan setelah rilis tanpa toko aplikasi. Ia berjalan di sisi Deno dan terlepas dari jalur serve, jadi bekerja di balik Deserve tanpa syarat.

### Mengarahkan ke Server Rilis

Updater butuh URL basis rilis di blok `desktop`. Runtime mengambil `<baseUrl>/latest.json` dan menarik file patch relatif terhadapnya:

```json
{
  "desktop": {
    "release": {
      "baseUrl": "https://releases.example.com/deserve-desktop"
    }
  }
}
```

URL ini satu-satunya server yang di-poll runtime dengan sendirinya. Format manifest dan alur patch ada di [referensi auto-update](https://docs.deno.com/runtime/desktop/auto_update/).

### Memeriksa Pembaruan

Panggilan tanpa argumen memakai URL basis terkonfigurasi sebagai default. Panggilan meresolusi entah ada pembaruan atau tidak, jadi membungkusnya dalam try menjaga gangguan server agar tidak muncul sebagai error tak tertangkap. Jalur error terpusat dijelaskan di [error handling](/id/error-handling/object-details):

```typescript twoslash
import type { Context } from '@neabyte/deserve'

// deno-lint-ignore no-explicit-any
const D = Deno as any

// routes/api/update.ts
export async function GET(ctx: Context): Promise<Response> {
  try {
    // Poll server rilis terkonfigurasi
    await D.autoUpdate()
    return ctx.send.json({ ok: true })
  } catch (error) {
    // Tertangkap di sini, lepas dari alert
    return await ctx.handleError(500, error as Error)
  }
}
```

Menerapkan pembaruan yang diunduh didukung di macOS dan Linux. Versi yang dibandingkannya berasal dari field `version` di akar yang diatur [Membangun Aplikasi](/id/recipes/desktop/getting-started#blok-desktop).

## Pelaporan Error

Bundle desktop menangkap eksepsi tak tertangkap, penolakan tak tertangani, dan panic runtime dengan sendirinya. Ia menampilkan alert native dengan pesan dan, saat URL pelaporan diatur, mem-`POST` laporan JSON. Pelapor mendaftar sebelum kode pengguna berjalan, jadi ia mencakup gangguan di sisi Deno dan sisi halaman.

### Mengonfigurasi Endpoint

URL pelaporan masuk ke blok `desktop` dan harus memakai `https://` atau `file://`. `http://` polos ditolak, karena laporan membawa jejak tumpukan. URL `file://` menambahkan laporan ke jalur lokal, yang cocok untuk uji coba:

```json
{
  "desktop": {
    "errorReporting": {
      "url": "https://errors.example.com/report"
    }
  }
}
```

Tanpa URL diatur, alert tetap muncul tetapi tidak ada laporan terkirim. Skema laporan dan daftar field ada di [referensi pelaporan error](https://docs.deno.com/runtime/desktop/error_reporting/).

### Apa yang Tertangkap

Pelapor melihat gangguan yang lolos dari handler, bukan yang sudah tertangkap. Error di dalam try milik sebuah route, seperti contoh [auto-update](#memeriksa-pembaruan) di atas, tidak pernah menjangkaunya. Ini berpasangan dengan [error handler terpusat](/id/error-handling/object-details) Deserve, yang membentuk respons HTTP, sementara pelapor desktop mencakup apa pun yang lolos dari jalur request sepenuhnya:

| Sumber                               | Ditangkap pelapor |
| ------------------------------------ | ----------------- |
| Eksepsi tak tertangkap di sisi Deno  | Ya                |
| Penolakan promise tak tertangani     | Ya                |
| Error tak tertangkap di halaman      | Ya                |
| Panic runtime                        | Ya                |
| Error di dalam try sebuah route      | Tidak             |

Sebuah route yang menangkap gangguannya dan meneruskannya ke `ctx.handleError()` menjaga pembentukan respons di satu tempat dan menyisakan alert native untuk yang benar-benar tak terduga.

Halaman terakhir membahas cara bundle dibangun dan dikirim, termasuk pilihan backend yang menentukan ketersediaan DevTools: [Backend dan Distribusi](/id/recipes/desktop/distribution).
