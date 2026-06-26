---
description: "Lindungi dari Cross-Site Request Forgery dengan pemeriksaan origin dan sec-fetch-site."
---

# Middleware CSRF

> **Referensi**: [MDN Cross-Site Request Forgery (CSRF)](https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/CSRF)

Middleware CSRF memblokir request lintas situs yang dipalsukan pada metode yang mengubah state. Metode aman (`GET`, `HEAD`, `OPTIONS`) selalu lolos, dan setiap metode lain harus cocok dengan header `Origin` atau header `Sec-Fetch-Site`. Request yang tidak cocok dengan aturan mana pun ditolak dengan **403 Forbidden**.

## Penggunaan Dasar

Tambahkan proteksi CSRF dengan `Mware.csrf()`:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()

// Request sama-origin lolos, lainnya ditolak
router.use(Mware.csrf())

await router.serve(8000)
```

Tanpa opsi, origin yang diizinkan default ke origin request dan `secFetchSite` default ke `['same-origin']`.

## Mengizinkan Origin Tertentu

Opsi `origin` menerima satu nilai, sebuah daftar, atau sebuah predikat:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Satu origin tepercaya
router.use(Mware.csrf({
  origin: 'https://app.example.com'
}))

// Daftar origin tepercaya
router.use(
  Mware.csrf({
    origin: [
      'https://app.example.com',
      'https://admin.example.com'
    ]
  })
)

// Predikat untuk logika khusus
router.use(
  Mware.csrf({
    origin: (value, ctx) => value.endsWith('.example.com')
  })
)
```

## Menyesuaikan Sec-Fetch-Site

Opsi `secFetchSite` mengikuti bentuk yang sama dan default ke `['same-origin']`:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Terima request same-origin dan same-site
router.use(
  Mware.csrf({
    secFetchSite: [
      'same-origin',
      'same-site'
    ]
  })
)
```

## Opsi CSRF

| Opsi           | Default            | Deskripsi                                            |
| -------------- | ------------------ | --------------------------------------------------- |
| `origin`       | origin request     | Nilai `Origin` yang diizinkan, daftar, atau predikat |
| `secFetchSite` | `['same-origin']`  | Nilai `Sec-Fetch-Site` yang diizinkan, daftar, atau predikat |

Sebuah predikat menerima nilai header dan konteks request, lalu mengembalikan `true` untuk mengizinkan request:

```typescript
type CsrfRulePredicate = (value: string, ctx: Context) => boolean
```

## Cara Kerja

- **Metode aman** - `GET`, `HEAD`, dan `OPTIONS` melewati pemeriksaan dan lanjut.
- **Pemeriksaan Origin** - header `Origin` dibandingkan dengan aturan `origin`.
- **Pemeriksaan Sec-Fetch-Site** - header `Sec-Fetch-Site` dibandingkan dengan aturan `secFetchSite`.
- **Izinkan** - request lolos ketika salah satu pemeriksaan cocok.
- **Tolak** - request ditolak dengan **403 Forbidden** ketika tidak ada yang cocok.

## Penanganan Error

Ketika request diblokir, middleware menghasilkan **403** dan pesan `Request blocked by CSRF protection`. Kegagalan itu dialirkan ke [error handler terpusat](/id/error-handling/object-details), jadi bentuk response di sana atau andalkan [perilaku default](/id/error-handling/default-behavior).

Aturan `origin` atau `secFetchSite` kustom yang melempar gagal pemeriksaannya sendiri dan jatuh aman ke penolakan, dan kesalahannya muncul sebagai event [`csrf:failed`](/id/middleware/observability/events) yang menyebut aturan mana yang rusak alih-alih tetap tersembunyi.
