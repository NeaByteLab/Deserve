---
description: "Karakteristik performa dan perilaku caching mesin template Deserve."
---

# Performa dan Batas

Mesin DVE meng-cache template terkompilasi dan menjaga rendering dengan dua batas, jadi halaman besar tetap cepat dan template liar gagal dengan jelas alih-alih menggantung server.

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

Setiap blok <code v-pre>{{#each}}</code> dibatasi `100_000` iterasi secara default, yang mencegah event loop kelaparan akibat perulangan tak terbatas. Setel dengan `maxIterations`:

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  viewsDir: './views',
  maxIterations: 200_000
})
```

Ketika perulangan melewati batas, mesin melempar dan server membalas **500**. Untuk dataset sangat besar, gunakan [streaming rendering](/id/rendering/streaming). Untuk rendering berat CPU, alihkan ke [worker pool](/id/core-concepts/worker-pool).

## Batas Kedalaman Include

Include template dibatasi 64 tingkat bersarang, jadi rantai include melingkar atau liar melempar error alih-alih berputar selamanya. Menjaga partial tetap dangkal aman jauh di dalam batas ini.
