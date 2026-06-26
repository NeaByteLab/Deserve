---
description: "Lindungi rute dengan middleware HTTP Basic Authentication di Deserve."
---

# Middleware Basic Auth

> **Referensi**: [Panduan HTTP Authentication MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Authentication)

Middleware HTTP Basic Authentication melindungi rute dengan kredensial username dan password, dan tetap sederhana serta aman untuk dikonfigurasi.

## Penggunaan Dasar

Lindungi rute dengan Basic Auth memakai `Mware.basicAuth()`:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()

// Jaga rute dengan daftar user
router.use(
  Mware.basicAuth({
    users: [
      {
        username: 'admin',
        password: 'secret'
      },
      {
        username: 'user',
        password: 'pass'
      }
    ]
  })
)

await router.serve(8000)
```

## Proteksi Spesifik Rute

Terapkan Basic Auth hanya ke rute tertentu:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Lindungi hanya rute /api
router.use(
  '/api',
  Mware.basicAuth({
    users: [
      {
        username: 'admin',
        password: 'secret'
      }
    ]
  })
)

// Lindungi rute admin dengan kredensial berbeda
router.use(
  '/admin',
  Mware.basicAuth({
    users: [
      {
        username: 'admin',
        password: 'admin123'
      }
    ]
  })
)
```

## Banyak User

Dukung beberapa akun user:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
router.use(
  Mware.basicAuth({
    users: [
      {
        username: 'admin',
        password: 'admin123'
      },
      {
        username: 'user',
        password: 'user123'
      },
      {
        username: 'guest',
        password: 'guest123'
      }
    ]
  })
)
```

## Realm Kustom

Opsi `realm` menamai area terlindungi di prompt browser dan default ke `'Secure Area'`:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Namai area yang muncul di prompt
router.use(
  Mware.basicAuth({
    realm: 'Admin Panel',
    users: [
      {
        username: 'admin',
        password: 'secret'
      }
    ]
  })
)
```

## Penanganan Error

Login yang gagal menghasilkan **401 Unauthorized** dan header `WWW-Authenticate: Basic realm="..."`, yang membuat browser menampilkan prompt login. Realm default ke `'Secure Area'` dan bisa diganti lewat opsi `realm`. Kredensial diperiksa dalam waktu konstan untuk menghindari kebocoran timing, dan array `users` kosong melempar `Deno.errors.InvalidData` saat middleware dibuat.

Tiap penolakan memancarkan event `auth:failed` dengan alasannya - `missing`, `malformed`, atau `invalid` - dibahas di [Referensi Event](/id/middleware/observability/events). Response 401 dialirkan ke [error handler terpusat](/id/error-handling/object-details), jadi bentuk response di sana atau andalkan [perilaku default](/id/error-handling/default-behavior).

## Autentikasi Browser

Browser meminta kredensial otomatis ketika rute terlindungi diakses:

```
Username: admin
Password: ******
```
