---
description: "Karakteristik performa dan perilaku caching mesin template Deserve."
---

# Performa dan Batas

Mesin DVE meng-cache template terkompilasi dan mengawal rendering dengan beberapa batas, jadi halaman besar tetap cepat dan template yang tak terkendali gagal dengan jelas alih-alih menggantung server.

## Caching

Template dikompilasi sekali, lalu AST hasil parse dipakai ulang pada tiap render berikutnya:

```typescript twoslash
import type { Context, DataRecord } from '@neabyte/deserve'
declare const ctx: Context
declare const data: DataRecord
declare const newData: DataRecord
// ---cut---
// Render pertama kompilasi dan cache AST
await ctx.render('template', data)

// Render berikutnya pakai cache AST
await ctx.render('template', newData)
```

Cache hanya mencakup kompilasi template, bukan data atau logika backend. Perubahan pada berkas membersihkan entri cache-nya lewat [hot reload](/id/core-concepts/hot-reload).

## Batas Iterasi

Setiap blok <code v-pre>{{#each}}</code> dibatasi `100_000` iterasi secara default, yang mencegah event loop kelaparan akibat satu perulangan tak terbatas. Setel dengan `maxIterations`:

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  viewsDir: './views',
  maxIterations: 200_000
})
```

Ketika perulangan melewati batas, mesin melempar dan server membalas **400 Bad Request**. Untuk dataset sangat besar, gunakan [streaming rendering](/id/rendering/streaming). Untuk rendering berat CPU, alihkan ke [worker pool](/id/core-concepts/worker-pool).

## Batas Anggaran Render

Dua batas lain mengawal seluruh render, bukan hanya satu perulangan. `maxRenderIterations` menjumlahkan setiap eksekusi badan <code v-pre>{{#each}}</code> di seluruh halaman, termasuk perulangan bersarang, dan default-nya `1_000_000`. `maxOutputSize` membatasi total karakter yang boleh dihasilkan satu render dan default-nya `5_000_000`:

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  viewsDir: './views',
  maxRenderIterations: 500_000,
  maxOutputSize: 2_000_000
})
```

Melewati salah satu batas membalas dengan **400 Bad Request**, status yang sama dengan batas per perulangan. Ketiganya diatur di [opsi Router](/id/getting-started/routes-configuration#opsi-konfigurasi).

## Batas Kedalaman Include

Include template dibatasi 64 tingkat bersarang, jadi rantai include melingkar atau tak terkendali melempar error alih-alih berputar selamanya. Melewati batas ini membalas dengan **400 Bad Request**. Selama struktur partial tidak terlalu dalam, render tetap jauh di dalam batas ini.
