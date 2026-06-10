---
description: "Rendering template sisi server di Deserve memakai view engine DVE bawaan."
---

# Ringkasan Rendering

> Lihat dokumentasi [penyorotan sintaks DVE](https://github.com/NeaByteLab/Deserve/tree/main/editor).

Deserve membawa mesin template bawaan bernama DVE (Deserve View Engine) untuk membangun HTML dinamis dari template polos dengan sintaks <code v-pre>{{ }}</code> yang ringkas.

## Pengaturan

Arahkan `viewsDir` ke folder template saat membuat router:

```typescript twoslash
import { Router } from '@neabyte/deserve'

// Arahkan viewsDir ke folder template
const router = new Router({
  viewsDir: './views'
})

await router.serve(8000)
```

## Template Pertama

Buat berkas `.dve` di dalam folder views:

```html
<!-- views/welcome.dve -->
<!DOCTYPE html>
<html>
  <head>
    <title>{{title}}</title>
  </head>
  <body>
    <h1>Hello {{name}}!</h1>
    <p>Today: {{date}}</p>
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

Ekstensi `.dve` opsional di dalam path, jadi `'welcome'` dan `'welcome.dve'` sama-sama menunjuk ke berkas yang sama.

## Penanganan Error

Template yang hilang melempar `Template "<name>" not found in views directory`, dan kegagalan render juga melempar. Biarkan keduanya sampai ke [penanganan error terpusat](/id/error-handling/object-details), atau tangkap di handler untuk balasan yang presisi:

```typescript twoslash
import type { Context, DataRecord } from '@neabyte/deserve'
declare const data: DataRecord
// ---cut---
export async function GET(ctx: Context): Promise<Response> {
  try {
    return await ctx.render('template', data)
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes('not found in views directory')) {
      return ctx.send.json(
        {
          error: 'Template missing'
        },
        {
          status: 404
        }
      )
    }
    return ctx.send.json(
      {
        error: 'Render failed'
      },
      {
        status: 500
      }
    )
  }
}
```

## Langkah Berikutnya

- [Sintaks Template](/id/rendering/syntax) - variabel, kondisional, perulangan, include, dan ekspresi.
- [Performa dan Batas](/id/rendering/performance) - caching, batas iterasi, dan batas kedalaman include.
- [Streaming Rendering](/id/rendering/streaming) - kirim HTML potongan demi potongan untuk halaman besar.
