---
description: 'Kirim server Deserve ke produksi dengan flag permission Deno yang tepat, perintah run yang terkunci, dan binary terkompilasi mandiri.'
---

# Production Deploy

Deno berjalan [tanpa permission secara bawaan](https://docs.deno.com/runtime/fundamentals/security/), jadi server produksi hanya mendapat akses yang diserahkan lewat command line. Server Deserve butuh sekumpulan kecil flag yang bisa diprediksi, dan [Deno CLI](https://docs.deno.com/runtime/reference/cli/) yang sama yang menjalankannya secara lokal juga mengompilasinya menjadi satu binary mandiri untuk deploy.

## Daftar Periksa Permission

Server Deserve menyentuh jaringan untuk mengikat port dan disk untuk membaca rute, view, dan berkas statis. Itu memetakan ke tiga flag, sisanya tetap mati kecuali sebuah app membutuhkannya:

| Flag             | Kenapa Deserve membutuhkannya                                | Wajib             |
| ---------------- | ------------------------------------------------------------ | ----------------- |
| `--allow-net`    | Mengikat port lewat `Deno.serve` dan menggerakkan `fetch`    | Ya                |
| `--allow-read`   | Meresolusi folder rute, view, dan berkas statis di disk      | Ya                |
| `--allow-env`    | Membaca variabel `PORT` saat port datang dari host           | Hanya dengan env  |
| `--allow-write`  | Tidak dipakai framework, hanya oleh app yang menyimpan berkas | Hanya saat menulis |

Permission write tetap mati untuk server biasa. Route yang menyimpan unggahan ke disk adalah alasan umum menambahkannya, dibatasi ke satu folder seperti pada [Upload File](/id/recipes/file-upload#menyimpan-ke-disk).

## Mengunci Permission

Permission `*` berguna saat membangun, namun produksi lebih terbaca saat tiap flag menyebut persis apa yang boleh disentuhnya. Membatasi `--allow-read` ke folder aset dan `--allow-env` ke satu variabel menjaga permukaan tetap kecil:

```bash
# Batasi tiap permission ke kebutuhannya
deno run \
  --allow-net \
  --allow-read=./routes,./views,./public \
  --allow-env=PORT \
  main.ts
```

Sebuah [`deno task`](https://docs.deno.com/runtime/reference/cli/task/) di `deno.json` menyimpan perintah panjang itu dan memberi deploy satu nama untuk dipanggil:

```json
{
  "tasks": {
    "start": "deno run --allow-net --allow-read=./routes,./views,./public --allow-env=PORT main.ts"
  }
}
```

Menjalankan `deno task start` lalu meluncurkan server dengan flag terkunci tiap kali.

## Membaca Port Dari Environment

Host biasanya menetapkan port lewat variabel `PORT`. Memanggil `serve()` tanpa port membaca `PORT` lebih dulu dan kembali ke `8000` sebagai default, jadi binary yang sama cocok untuk run lokal dan host terkelola:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routesDir: './routes'
})
// ---cut---
// Baca env PORT, fallback ke 8000
await router.serve()
```

Membaca variabel itulah yang dicakup `--allow-env=PORT`. Memberi angka eksplisit seperti `serve(8000)` melewati pencarian, jadi flag env jadi tidak relevan saat port di-hardcode. Argumen host dan sinyal lengkap ada di [Graceful Shutdown](/id/recipes/graceful-shutdown).

## Mengompilasi Binary Mandiri

[`deno compile`](https://docs.deno.com/runtime/reference/cli/compile/) menyatukan server dan permission-nya menjadi satu executable yang berjalan tanpa Deno terpasang, yang cocok untuk kontainer ramping atau host polos. Flag permission berada pada perintah compile agar binary membawanya:

```bash
# Satukan server dan flag-nya jadi binary
deno compile \
  --allow-net \
  --allow-read=./routes,./views,./public \
  --allow-env=PORT \
  --output server \
  main.ts
```

Hasilnya berjalan langsung dari `./server` dengan flag sudah di dalam. Satu catatan cocok untuk Deserve, karena [hot reload](/id/core-concepts/hot-reload) memantau berkas di disk dan binary terkompilasi menyajikan snapshot tetap, jadi suntingan setelah build perlu compile baru alih-alih pertukaran langsung.

## Mengawasinya Berjalan

Produksi butuh mata pada server tanpa membanjiri konsol dengan cetakan, yang merupakan tujuan [bus event observability](/id/middleware/observability/overview). Satu listener [`router.on()`](/id/middleware/observability/events) meneruskan event lifecycle, request, dan kesalahan ke apa pun yang mengumpulkan log, dan [pelaporan error](/id/middleware/observability/errors) merutekan kegagalan ke tempat yang sama. Berhenti bersih saat deploy dicakup oleh [Graceful Shutdown](/id/recipes/graceful-shutdown), dan memindahkan kerja berat tanpa memblokir server dicakup oleh [worker pool](/id/core-concepts/worker-pool).
