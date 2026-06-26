---
description: "Karakteristik performa dan perilaku caching mesin template Deserve."
---

# Performa dan Batas

Mesin DVE meng-cache template terkompilasi dan mengawal tiap render dengan sekumpulan batas, jadi halaman besar tetap cepat dan template yang tak terkendali gagal dengan jelas alih-alih menggantung server. Setiap batas dikonfigurasi di bawah `views` pada [opsi Router](/id/getting-started/routes-configuration#views).

## Caching

Template dikompilasi sekali, lalu hasil parsing-nya dipakai ulang pada tiap render berikutnya:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
declare const data: Record<string, unknown>
declare const newData: Record<string, unknown>
// ---cut---
// Render pertama kompilasi dan cache
await ctx.render('template', data)

// Render berikutnya pakai cache
await ctx.render('template', newData)
```

Cache hanya mencakup kompilasi, bukan data atau logika backend. Mengedit berkas membersihkan entri-nya lewat [hot reload](/id/core-concepts/hot-reload), jadi render berikutnya mengompilasi sumber yang baru.

## Batas Iterasi

Setiap blok <code v-pre>{{#each}}</code> dibatasi `100_000` iterasi secara default, yang mencegah satu perulangan tak terbatas membuat event loop kelaparan. Mesin memeriksa panjang array sebelum memancarkan item apa pun, jadi perulangan berukuran berlebih gagal cepat. Setel dengan `views.maxIterations`:

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  views: {
    directory: './views',
    maxIterations: 200_000
  }
})
```

Ketika perulangan melewati batas, mesin melempar dan server membalas **400 Bad Request**. Untuk dataset sangat besar, gunakan [streaming rendering](/id/rendering/streaming). Untuk rendering berat CPU, alihkan ke [worker pool](/id/recipes/worker-pool).

## Batas Anggaran Render

Dua batas lain mengawal seluruh render, bukan hanya satu perulangan. `maxRenderIterations` menjumlahkan setiap eksekusi badan <code v-pre>{{#each}}</code> di seluruh halaman, termasuk perulangan bersarang, dan default-nya `1_000_000`. `maxOutputSize` membatasi total karakter yang boleh dihasilkan satu render dan default-nya `5_000_000`:

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  views: {
    directory: './views',
    maxRenderIterations: 500_000,
    maxOutputSize: 2_000_000
  }
})
```

Melewati salah satu batas membalas dengan **400 Bad Request**, status yang sama dengan batas per perulangan. Jaga `maxRenderIterations` di atas atau sama dengan `maxIterations`, jika tidak satu perulangan besar akan menyentuh batas total lebih dulu.

## Batas Ukuran Template

`maxTemplateSize` membatasi karakter dari satu sumber template, diperiksa saat kompilasi, dan default-nya `1_000_000`. Batas sama berlaku ke setiap berkas include atau layout yang diresolusi mesin. Sumber berukuran berlebih melempar sebelum parsing dimulai, yang membalas dengan **400 Bad Request**:

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  views: {
    directory: './views',
    maxTemplateSize: 500_000
  }
})
```

## Batas Kedalaman Include

Include template dan rantai layout berbagi batas 64 tingkat bersarang, jadi rantai melingkar atau tak terkendali melempar alih-alih berputar selamanya. Melewati batas ini membalas dengan **400 Bad Request**. Menjaga partial dan layout tetap dangkal tetap jauh di dalam batas ini, yang dibahas bersama sintaks [include](/id/rendering/syntax#includes) dan [layout](/id/rendering/syntax#layouts).
