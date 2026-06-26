---
description: 'Mengapa win.bind dan proxy bindings tidak bertahan pada jalur serve Deserve, serta pola API HTTP plus executeJs yang membawa data antara halaman dan sisi Deno di kedua arah.'
---

# Bindings dan Jembatan HTTP

> **Referensi**: [Bindings Deno Desktop](https://docs.deno.com/runtime/desktop/bindings/)

Runtime `deno desktop` membawa sebuah kanal binding. [`win.bind()`](https://docs.deno.com/api/deno/~/Deno.BrowserWindow.bind) mendaftarkan fungsi Deno, dan halaman memanggilnya lewat proxy `bindings.<name>()` seakan fungsi itu lokal, tanpa lompatan HTTP. Ini satu-satunya bagian permukaan desktop yang tidak bekerja di balik server Deserve, jadi halaman ini menjelaskan perilakunya dan pola yang menggantikannya.

## Apa yang Dijanjikan Kanal

Di luar Deserve, sebuah binding terlihat rapi. Sisi Deno mendaftarkan handler, halaman memanggilnya, dan panggilan meresolusi melintasi batas:

```typescript twoslash
// deno-lint-ignore no-explicit-any
const win = {} as any
// ---cut---
// Sisi Deno, mendaftarkan handler
win.bind('saveNote', async (text: string) => {
  await Deno.writeTextFile('./note.txt', text)
  return { ok: true }
})
```

```typescript twoslash
// Sisi halaman, panggil seperti fungsi lokal
// deno-lint-ignore no-explicit-any
declare const bindings: any
// ---cut---
const result = await bindings.saveNote('hello')
```

## Mengapa Rusak di Balik Deserve

Jembatan binding menempel ke webview saat runtime menegakkan servernya sendiri. Deserve menjalankan jalur serve-nya lewat panggilan internal `Deno.serve` yang dibungkus logika framework, dan pembungkus itu melepas jembatan dari webview yang terlihat. Proxy tetap menjawab di halaman, `typeof bindings.saveNote` terbaca `function`, karena proxy membangun fungsi saat diakses. Panggilannya sendiri lalu ditolak:

```
Error: No callback bound for: saveNote
```

Kegagalan tidak bergantung pada waktu. Bind sebelum serve, bind setelah server mulai, memuat ulang jendela, atau mengonstruksi jendela belakangan semua ditolak dengan cara yang sama. `Deno.serve` mentah plus `win.bind` bekerja, dan `win.bind` yang sama di balik `router.serve()` tidak, yang menempatkan penyebab pada jalur serve alih-alih panggilan binding.

Intinya singkat. Perlakukan bindings sebagai tak tersedia di aplikasi desktop Deserve dan bawa data lewat HTTP.

## Penggantinya: Dua Arah

Aplikasi desktop butuh lalu lintas dua arah, halaman ke Deno dan Deno ke halaman. Dua transport sudah mencakup keduanya, dan tak satu pun menyentuh kanal binding.

### Halaman ke Deno Lewat HTTP

Halaman memanggil route API, dan route berjalan dengan izin Deno. Ini bentuk panggilan yang sama dari [Menyajikan UI](/id/recipes/desktop/serving#berbicara-kembali-ke-server), kini dibingkai sebagai pengganti binding:

```typescript twoslash
// Sisi halaman, mengganti panggilan bindings
async function saveNote(text: string): Promise<{ path: string }> {
  // Post ke route API lokal sebagai gantinya
  const response = await fetch('/api/note', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text })
  })
  return await response.json()
}
```

```typescript twoslash
import type { Context } from '@neabyte/deserve'

// routes/api/note.ts
export async function POST(ctx: Context): Promise<Response> {
  // Baca body request JSON bertipe
  const requestBody = await ctx.get.body<{ text?: string }>()
  const homeDir = Deno.env.get('HOME') ?? '.'
  const path = `${homeDir}/.note.txt`
  // Tulis catatan dengan izin Deno
  await Deno.writeTextFile(path, requestBody?.text ?? '')
  return ctx.send.json({ path })
}
```

Route memiliki akses disk, jadi satu handler melayani halaman di jendela dan browser di host tanpa percabangan.

### Deno ke Halaman dengan executeJs

Arah lainnya menjalankan potongan di dalam halaman dari sisi Deno dengan `executeJs()`, panggilan yang sama yang dipakai [handler menu](/id/recipes/desktop/native-apis#menu-aplikasi). Halaman menaruh fungsi `saveNote` dari atas ke `window`, dan sisi native memanggilnya berdasarkan nama:

```typescript twoslash
// deno-lint-ignore no-explicit-any
async function saveNote(text: string): Promise<{ path: string }> {
  return { path: '' }
}
// ---cut---
// Baca textarea, lalu pakai ulang saveNote
function saveNoteFromPage(): Promise<{ path: string }> {
  const field = document.querySelector('textarea')
  return saveNote(field?.value ?? '')
}
// Paparkan untuk menu native
// deno-lint-ignore no-explicit-any
;(window as any).saveNote = saveNoteFromPage
```

```typescript twoslash
// deno-lint-ignore no-explicit-any
const win = {} as any
// ---cut---
// Jalankan handler halaman jika ada
win.executeJs('if (window.saveNote) window.saveNote()')
```

Pintasan menu dan tombol di halaman kini berbagi satu jalur simpan. Menu memanggil `executeJs`, tombol memanggil `saveNote` langsung, dan keduanya mendarat di route API yang sama. Penjaga penting karena `executeJs` bisa berjalan sebelum halaman selesai dimuat, saat `window.saveNote` masih tak terdefinisi.

## Membaca Hasil

Halaman yang butuh nilai dari Deno, seperti status berjalan atau info sistem, membacanya dari route JSON alih-alih nilai kembalian binding. Pemeriksaan desktop dari [Menyajikan UI](/id/recipes/desktop/serving#mendeteksi-mode-desktop) mengikuti bentuk persis ini, di mana `Deno.desktopVersion` melintas lewat API alih-alih lewat `bindings`.

## Biaya dan Imbalan

Lompatan HTTP menambah satu perjalanan loopback bolak-balik yang akan dilewati sebuah binding. Pada koneksi lokal, biayanya di bawah persepsi manusia untuk laju request yang dihasilkan UI desktop, jadi tukar-tambahnya berpihak pada model yang lebih sederhana. Imbalannya adalah satu server yang berperilaku identik di host dan di jendela, tanpa lapisan binding terpisah untuk didaftarkan, di-debug, atau dijaga tetap selaras.

Dengan data mengalir dua arah, bagian yang tersisa adalah layanan runtime yang duduk di sisi Deno: [Notifikasi, Auto-update dan Pelaporan Error](/id/recipes/desktop/notifications-updates).
