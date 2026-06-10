---
description: "Penanganan error berlapis di Deserve untuk menjaga service tetap tersedia saat ada kesalahan."
---

# Pertahanan Berlapis

Error di Deserve melewati beberapa lapisan, dan tiap lapisan adalah kesempatan untuk menangkap, membentuk, atau mencatat kegagalan. Ketika satu lapisan meloloskan error, lapisan berikutnya tetap menahan, jadi server terus merespons dan tidak pernah crash.

![Lima lapis pertahanan error: try/catch route handler, WrapMware labeled catch, custom handler router.catch, default handler dengan pesan tersamar, dan process guard yang tidak pernah crash](/diagrams/defense-in-depth.png)

## Lapis 1 - Route Handler

Lapisan terdekat adalah handler itu sendiri. Sebuah `try/catch` lokal mengubah kegagalan yang diduga menjadi response yang presisi:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export async function POST(ctx: Context): Promise<Response> {
  try {
    const data = await ctx.body()
    return ctx.send.json({
      success: true
    })
  } catch (error) {
    // Tangani kegagalan yang diduga di sini
    return ctx.send.json(
      {
        error: 'Invalid body'
      },
      {
        status: 400
      }
    )
  }
}
```

Apa pun yang dilempar melewati titik ini diteruskan ke lapisan berikutnya.

## Lapis 2 - Middleware Berlabel

`WrapMware` membungkus sebuah middleware sehingga lemparan menjadi error berlabel yang dialihkan ke error handler. Label menunjuk langsung ke middleware yang gagal:

```typescript twoslash
import { Router, WrapMware } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Lemparan di sini sampai ke router.catch dengan label
const auth = WrapMware('Auth', async (ctx, next) => {
  if (!ctx.header('authorization')) {
    throw new Error('Missing token')
  }
  return await next()
})

router.use(auth)
```

Lihat [Global Middleware](/id/middleware/global#membungkus-middleware-dengan-penanganan-error) untuk pola lengkapnya.

## Lapis 3 - Error Handler Khusus

`router.catch()` menerima setiap error yang tak tertangkap dan membentuk response klien. Handler ini berjalan untuk error handler, error middleware, not-found, dan error berkas statis sama saja:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
router.catch((ctx, error) => {
  // Bentuk satu response untuk semua error
  return ctx.send.json(
    {
      error: 'Something went wrong'
    },
    {
      status: error.statusCode
    }
  )
})
```

Handler menerima objek error dengan `statusCode`, `pathname`, `url`, `method`, dan `error` asli. Lihat [Detail Objek](/id/error-handling/object-details) untuk tiap field.

## Lapis 4 - Handler Default

Ketika tidak ada `router.catch()` yang diatur, atau handler khusus mengembalikan sesuatu selain `Response`, Deserve memakai handler default. Handler ini menegosiasikan JSON atau HTML lewat header `Accept` dan **menyamarkan pesan asli**, jadi error yang dilempar tidak pernah membocorkan teksnya ke klien:

```typescript
// Klien mendapat pesan aman berbasis status
// 500 -> "Internal Server Error"
// 404 -> "Not Found"
```

Response default juga membawa [security headers](/id/middleware/security-headers) bawaan. Lihat [Perilaku Default](/id/error-handling/default-behavior) untuk bentuk response lengkapnya.

## Lapis 5 - Process Guard

Lapisan terluar berjalan tingkat proses. Router yang sedang melayani menjebak unhandled rejection, uncaught error, dan upaya terminasi yang diblokir, lalu melaporkan tiap kejadian sebagai event `process:error` alih-alih membiarkan proses mati:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
router.on((event) => {
  if (event.kind === 'process:error') {
    const { origin, error } = event.metadata as { origin: string; error: Error }
    console.error(`process fault [${origin}]`, error.message)
  }
})
```

Ini jaring pengaman di balik semua yang lain. Lihat [Proteksi Proses](/id/getting-started/server-configuration#proteksi-proses) untuk apa yang diblokir dan alasannya, dan [Pelaporan Error](/id/middleware/observability/errors) untuk cara menangkapnya.

## Mencatat di Seluruh Lapisan

Membentuk response dan mencatat kegagalan adalah tugas terpisah. `router.catch()` mengontrol apa yang dilihat klien, sementara [`router.on()`](/id/middleware/observability/overview) mencatat apa yang terjadi untuk log dan metrik. Pasang keduanya untuk cakupan penuh:

![Satu request gagal menyebar ke dua hook independen, di mana router.catch membentuk Response yang diterima klien dengan status dan body terkontrol, dan router.on mencatat kegagalan yang sama ke log dan metrik tanpa memengaruhi balasan](/diagrams/obs-catch-vs-on.png)

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Bentuk response klien
router.catch((ctx, info) => {
  return ctx.send.json(
    {
      error: 'Something went wrong'
    },
    {
      status: info.statusCode
    }
  )
})

// Catat kegagalan untuk nanti
router.on((event) => {
  if (event.kind === 'request:error') {
    const { url, error } = event.metadata as { url: string; error?: Error }
    console.error(url, error?.message)
  }
})
```
