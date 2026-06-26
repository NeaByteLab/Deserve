---
description: 'Menyajikan UI desktop dari router Deserve yang mengikat port yang diberikan runtime, merender halaman dengan view engine DVE, dan membaca kembali alamat server dari environment.'
---

# Menyajikan UI

> **Referensi**: [Penyajian HTTP Deno Desktop](https://docs.deno.com/runtime/desktop/serving/)

Di dalam bundle desktop, halaman adalah halaman web sungguhan yang disajikan lewat HTTP, dan Deserve adalah server di baliknya. Jendela membuka webview, webview meminta `/` dari port lokal, dan [router](/id/getting-started/server-configuration) menjawab dengan HTML yang dirender. Tiap request berikutnya, sebuah panggilan API atau kiriman form, melintasi koneksi loopback yang sama.

## Cara Port Ditetapkan

Di host, `router.serve(8000)` mengikat port yang diberikan padanya. Di dalam bundle desktop, runtime memilih port loopback bebas lebih dulu dan menyerahkannya ke server lewat variabel environment `DENO_SERVE_ADDRESS`. Deserve membaca alamat itu saat mengikat, jadi angka di sumber menjadi cadangan alih-alih port final.

Jendela menavigasi ke port yang ditetapkan dengan sendirinya, jadi halaman dimuat tanpa rangkaian tambahan. Panggilan serve tetap terbaca wajar:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const base = import.meta.dirname

const router = new Router({
  routes: { directory: `${base}/routes` },
  views: { directory: `${base}/views` }
})
// ---cut---
// Runtime menimpa port ini di bundle
await router.serve(8000, '127.0.0.1')
```

## Menemukan Port

Sebuah route yang perlu melaporkan alamat server aktif membaca `DENO_SERVE_ADDRESS` dan mengambil port darinya. Variabel ini menyimpan string `host:port`, jadi port adalah segmen terakhir:

```typescript twoslash
import type { Context } from '@neabyte/deserve'

// routes/api/system.ts
export function GET(ctx: Context): Response {
  // Baca port yang ditetapkan runtime
  const serverAddress = Deno.env.get('DENO_SERVE_ADDRESS')
  const port = serverAddress ? serverAddress.split(':').pop() : '8000'
  return ctx.send.json({
    server: `http://127.0.0.1:${port}`
  })
}
```

Membaca variabel inilah yang dicakup flag `--allow-env` dari [Membangun Aplikasi](/id/recipes/desktop/getting-started#mendefinisikan-task).

## Merender Halaman

View engine menyala begitu `views.directory` menunjuk ke folder template, penyiapan yang sama seperti di host. Sebuah route lalu merender template dengan [`ctx.render()`](/id/core-concepts/context-object), dan HTML yang dirender adalah halaman yang ditampilkan jendela:

```typescript twoslash
import type { Context } from '@neabyte/deserve'

// routes/index.ts
export async function GET(ctx: Context): Promise<Response> {
  // Render template beranda dengan data
  return await ctx.render('index', {
    appName: 'Deserve Desktop',
    version: '0.1.0'
  })
}
```

Template itu sendiri adalah file [DVE](/id/rendering/syntax). Sebuah layout menampung cangkang, termasuk tautan styling seperti CDN CSS, dan halaman memperluasnya. [Panduan view engine](/id/rendering/) membahas sintaks layout dan block, jadi sisi desktop hanya perlu menunjuk `views.directory` ke folder dan memanggil `render`.

## Berbicara Kembali ke Server

JavaScript browser di dalam jendela tidak bisa menyentuh disk atau OS, karena webview tersandboxkan seperti browser mana pun. Yang bisa ia lakukan adalah memanggil server, yang berjalan dengan izin Deno. Tombol yang menyimpan data mem-post ke route API, dan route menulis file:

```typescript twoslash
// Sisi halaman, berjalan di dalam webview
async function saveNote(text: string): Promise<void> {
  // Post ke route API lokal
  await fetch('/api/note', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text })
  })
}
```

```typescript twoslash
import type { Context } from '@neabyte/deserve'

// routes/api/note.ts
export async function POST(ctx: Context): Promise<Response> {
  // Baca body request JSON bertipe
  const requestBody = await ctx.get.body<{ text?: string }>()
  const homeDir = Deno.env.get('HOME') ?? '.'
  // Tulis catatan ke folder home
  await Deno.writeTextFile(`${homeDir}/.note.txt`, requestBody?.text ?? '')
  return ctx.send.json({ ok: true })
}
```

Panggilan HTTP halaman-ke-server ini adalah tulang punggung aplikasi desktop Deserve, dan bentuknya sama baik server berjalan di host maupun di jendela. Alasan ia menggantikan kanal binding native ada di [Bindings dan Jembatan HTTP](/id/recipes/desktop/bindings).

## Mendeteksi Mode Desktop

Halaman terkadang perlu tahu apakah ia berjalan di jendela atau tab browser biasa. [`Deno.desktopVersion`](https://docs.deno.com/api/deno/~/Deno.desktopVersion) membawa string versi di dalam bundle desktop dan tak terdefinisi di tempat lain, jadi sebuah route sistem bisa melaporkannya dan halaman bisa bercabang pada nilai itu:

```typescript twoslash
import type { Context } from '@neabyte/deserve'

// deno-lint-ignore no-explicit-any
const D = Deno as any

export function GET(ctx: Context): Response {
  return ctx.send.json({
    // Non-null hanya di dalam bundle desktop
    desktopVersion: D.desktopVersion ?? null
  })
}
```

Membaca nilai lewat API menjaga pemeriksaan tetap di server, tempatnya berada, dan membebaskan halaman dari pencarian native apa pun. Jendela native itu sendiri, beserta menu dan tray yang mengelilingi server ini, adalah pokok dari [Jendela, Menu, Tray dan Dialog](/id/recipes/desktop/native-apis).
