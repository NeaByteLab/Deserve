---
description: 'Memilih backend rendering untuk aplikasi desktop Deserve, membangun bundle platform seperti app, dmg, msi, dan AppImage, mengompilasi-silang ke target lain dari satu host, serta menandatangani kode bundle macOS.'
---

# Backend dan Distribusi

> **Referensi**: [Backend Deno Desktop](https://docs.deno.com/runtime/desktop/backends/)

Langkah terakhir mengubah proyek menjadi bundle siap kirim. Pilihan backend menentukan cara halaman dirender dan apakah DevTools tersedia, ekstensi keluaran menentukan format paket, dan satu host bisa mengompilasi-silang untuk tiap target. Server Deserve tetap sama di sepanjang itu, karena distribusi adalah urusan pengemasan.

## Memilih Backend

Field `backend`, atau flag `--backend`, memilih engine rendering yang dipanggang ke bundle. Tiga opsi ada, dan hanya dua yang cocok untuk aplikasi Deserve:

| Backend   | Rendering                          | Ukuran          | DevTools | Cocok Deserve |
| --------- | ---------------------------------- | --------------- | -------- | ------------- |
| `webview` | Webview OS, default                | Kecil           | Tidak    | Ya            |
| `cef`     | Chromium terbundel                 | Besar, ~150 MB  | Ya       | Ya            |
| `raw`     | Tanpa engine web                   | Terkecil        | Tidak    | Tidak         |

Backend `webview` memakai engine OS, WKWebView di macOS, WebView2 di Windows, WebKitGTK di Linux. Ia menjaga bundle kecil dan merender halaman Deserve dengan baik, dengan harga perbedaan rendering antar platform.

Backend `cef` membundel Chromium untuk rendering identik di mana-mana dan DevTools penuh, sebagai gantinya unduhan jauh lebih besar. Binary framework diunduh sekali dan tercache.

Backend `raw` tidak punya webview sama sekali, jadi UI Deserve yang disajikan lewat HTTP tak punya apa pun untuk merendernya. Build berhasil dan server tetap berjalan, tetapi tak ada halaman muncul. Sisihkan `raw` untuk aplikasi yang menggambar permukaannya sendiri, bukan untuk UI web.

```json
{
  "desktop": {
    "backend": "webview"
  }
}
```

Flag `--backend` menimpa field untuk satu build dan hanya menerima `cef` serta `webview`. Memilih `raw` terjadi lewat field. Beralih antara `cef` dan `webview` tak butuh perubahan kode, karena API jendela, menu, dan event yang sama bekerja di keduanya.

## DevTools

DevTools menempel ke halaman untuk memeriksa elemen, konsol, dan panel jaringan. Ia hanya tersedia pada backend `cef`. Backend `webview` default berbicara protokol inspektor berbeda yang belum dituju DevTools terpadu, jadi [`win.openDevtools()`](https://docs.deno.com/api/deno/~/Deno.BrowserWindow.openDevtools) tak berefek di sana.

Build yang butuh DevTools beralih ke `cef` untuk pengembangan, lalu mengirim pada backend mana pun yang cocok untuk rilis:

```bash
# Jalankan dengan Chromium untuk DevTools
deno desktop --backend cef --include routes --include views main.ts
```

Sisi Deno menjalankan inspektor di bawah `--inspect` apa pun backend-nya, jadi debugging sisi server tetap tersedia bahkan di `webview`. Alur inspektor lengkap ada di [referensi DevTools](https://docs.deno.com/runtime/desktop/devtools/).

## Format Keluaran

Ekstensi keluaran menentukan paket yang dihasilkan build. Blok `output` mengatur jalur per platform, dan flag [`--output`](https://docs.deno.com/runtime/desktop/distribution/) menimpanya untuk satu build:

```json
{
  "desktop": {
    "output": {
      "macos": "./dist/DeserveDesktop.app",
      "windows": "./dist/DeserveDesktop",
      "linux": "./dist/deserve-desktop"
    }
  }
}
```

Tiap platform menerima beberapa ekstensi:

| Platform | Ekstensi      | Menghasilkan                       |
| -------- | ------------- | ---------------------------------- |
| macOS    | `.app`        | Bundle aplikasi, default            |
| macOS    | `.dmg`        | Image disk seret-ke-Applications    |
| Windows  | direktori     | Folder aplikasi dengan peluncur     |
| Windows  | `.msi`        | Paket Windows Installer             |
| Linux    | direktori     | Folder aplikasi dengan peluncur     |
| Linux    | `.AppImage`   | Bundle portabel file tunggal        |
| Linux    | `.deb`        | Paket Debian atau Ubuntu            |
| Linux    | `.rpm`        | Paket Fedora atau RHEL              |

`.dmg` memanggil `hdiutil`, jadi ia harus dibangun di host macOS. Sisanya dirakit dalam Rust murni dan dibangun dari host mana pun:

```bash
# Bangun image disk seret-ke-Applications
deno desktop --include routes --include views --output ./dist/DeserveDesktop.dmg main.ts
```

## Kompilasi-Silang

Satu host membangun untuk tiap target yang didukung. `--target` menamai satu triple, dan `--all-targets` mencakup semuanya. CLI mengunduh runtime dan arsip backend yang cocok untuk target, tanpa toolchain platform di host:

```bash
# Bangun untuk macOS Intel dari host mana pun
deno desktop --target x86_64-apple-darwin --include routes --include views main.ts
```

Triple yang didukung adalah `aarch64-apple-darwin`, `x86_64-apple-darwin`, `x86_64-pc-windows-msvc`, `aarch64-unknown-linux-gnu`, dan `x86_64-unknown-linux-gnu`. Satu-satunya pengecualian untuk pembangunan-silang bebas-host adalah `.dmg` macOS, yang butuh `hdiutil` dan karenanya host macOS. Matriks lengkap dan contoh CI ada di [referensi distribusi](https://docs.deno.com/runtime/desktop/distribution/).

## Mengompresi Bundle

`--compress` mengirim bundle swa-ekstrak. Muatan runtime berat dikompresi di aplikasi terdistribusi dan dibongkar ke folder per-pengguna saat jalan pertama, yang mengecilkan unduhan sebagai ganti satu kali dekompresi:

```bash
# Unduhan lebih kecil, bongkar saat jalan pertama
deno desktop --compress --include routes --include views main.ts
```

Codec default ke pengaturan artefak-lebih-kecil dan bisa dipilih dengan `--compress=xz` atau `--compress=zstd`, di mana `zstd` menukar sebagian ukuran demi jalan pertama lebih cepat.

## Penandatanganan Kode

Di macOS, `deno desktop` menandatangani bundle dengan sendirinya. Default-nya adalah tanda tangan ad-hoc, ditulis sebagai `-`, yang memberi aplikasi identitas kode stabil, cukup agar OS memberi [izin notifikasi](/id/recipes/desktop/notifications-updates#syarat-di-macos), tetapi tidak cukup untuk didistribusikan tanpa peringatan Gatekeeper:

```json
{
  "desktop": {
    "macos": {
      "codesignIdentity": "-"
    }
  }
}
```

Identitas Developer ID asli menggantikan `-` dan menghasilkan bundle yang dapat dinotarisasi, ditandatangani dengan Hardened Runtime. Notarisasi tetap langkah terpisah yang dijalankan dengan `xcrun notarytool`. Penandatanganan berjalan di host macOS, karena ia memanggil `codesign`. Detail penandatanganan dan notarisasi ada di [referensi distribusi](https://docs.deno.com/runtime/desktop/distribution/#code-signing).

## Kembali ke Peta

Itu menutup lingkaran dari build pertama menuju bundle terkirim. [Ringkasan](/id/recipes/desktop/overview#kompatibilitas-fitur) menyimpan peta kompatibilitas untuk seluruh permukaan, dan server Deserve produksi di luar konteks desktop dibahas di [Deploy Produksi](/id/recipes/production-deploy).
