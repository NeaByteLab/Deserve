---
description: "Rendering template sisi server di Deserve memakai view engine DVE bawaan."
---

# Ringkasan Rendering

Deserve membawa mesin template bawaan bernama DVE (Deserve View Engine). DVE mengubah template HTML polos menjadi halaman jadi dengan mengisi sintaks <code v-pre>{{ }}</code> yang ringkas memakai data rute. DVE berada di paketnya sendiri, jadi mesin yang sama bekerja di luar Deserve juga. Referensi lengkapnya ada di [JSR](https://jsr.io/@neabyte/dve) dan [npm](https://www.npmjs.com/package/@neabyte/dve), dengan kode sumbernya di [GitHub](https://github.com/NeaByteLab/DVE).

## Pengaturan

View engine aktif begitu `views.directory` menunjuk ke folder template. Ketika dihilangkan, `ctx.render()` melempar `Deno.errors.NotSupported` karena tidak ada engine yang dikonfigurasi:

```typescript twoslash
import { Router } from '@neabyte/deserve'

// Arahkan views.directory ke folder template
const router = new Router({
  views: {
    directory: './views'
  }
})

await router.serve(8000)
```

Batas render juga berada di bawah `views`, dibahas di [Performa dan Batas](/id/rendering/performance) dan [Konfigurasi Routes](/id/getting-started/routes-configuration#views).

## Template Pertama

Buat berkas `.dve` di dalam folder views:

```html
<!-- views/welcome.dve -->
<!DOCTYPE html>
<html>
  <head>
    <title>{{ title }}</title>
  </head>
  <body>
    <h1>Hello {{ name }}!</h1>
    <p>Today: {{ date }}</p>
  </body>
</html>
```

Lalu render dari sebuah rute dengan `ctx.render()`:

```typescript twoslash
// routes/welcome.ts
import type { Context } from '@neabyte/deserve'

export async function GET(ctx: Context): Promise<Response> {
  // Render template dengan data
  return await ctx.render('welcome', {
    title: 'Welcome Page',
    name: 'John Doe',
    date: new Date().toLocaleDateString()
  })
}
```

Ekstensi `.dve` opsional di dalam path, jadi `'welcome'` dan `'welcome.dve'` sama-sama menunjuk ke berkas yang sama. Pencarian juga melepas garis miring di depan dan menormalkan backslash, jadi path gaya Windows tetap menemukan template-nya.

## Caching dan Reload

Render pertama sebuah template mengompilasinya dan menyimpan hasil parsing-nya, dan setiap render berikutnya memakai ulang cache itu. Mengedit berkas `.dve` membersihkan entri-nya lewat [hot reload](/id/core-concepts/hot-reload), jadi render berikutnya menangkap perubahannya tanpa restart. Angka di baliknya ada di [Performa dan Batas](/id/rendering/performance#caching).

## Penanganan Error

Berkas template yang hilang melempar `Deno.errors.NotFound`, dan kegagalan kompilasi atau render juga melempar. Keduanya sampai ke [error handler terpusat](/id/error-handling/object-details) yang diatur dengan `router.catch()`, yang membentuk satu balasan untuk seluruh aplikasi alih-alih try/catch di tiap rute. Berkas yang hilang dipetakan ke **404 Not Found**, dan kegagalan kompilasi atau render dipetakan ke **400 Bad Request**.

Ketika satu rute butuh balasan presisi, tangkap throw-nya dan bercabang pada tipe error-nya:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const data: Record<string, unknown>
// ---cut---
export async function GET(ctx: Context): Promise<Response> {
  try {
    return await ctx.render('template', data)
  } catch (error) {
    // Berkas hilang melempar NotFound
    if (error instanceof Deno.errors.NotFound) {
      return ctx.send.json({ error: 'Template missing' }, { status: 404 })
    }
    return ctx.send.json({ error: 'Render failed' }, { status: 500 })
  }
}
```

Kegagalan render juga muncul di [observability bus](/id/middleware/observability/overview) sebagai event [`view:failed`](/id/middleware/observability/events#view), jadi logging tinggal di satu tempat sementara error handler membentuk response-nya.

## Langkah Berikutnya

- [Sintaks Template](/id/rendering/syntax) - variabel, kondisional, perulangan, include, layout, dan ekspresi.
- [Performa dan Batas](/id/rendering/performance) - caching, batas iterasi, batas keluaran, dan kedalaman include.
- [Streaming Rendering](/id/rendering/streaming) - kirim HTML potongan demi potongan untuk halaman besar.
