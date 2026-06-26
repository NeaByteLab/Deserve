---
description: "Konfigurasi kebijakan Cross-Origin Resource Sharing (CORS) untuk rute Deserve."
---

# Middleware CORS

> **Referensi**: [Panduan HTTP CORS MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)

Middleware CORS (Cross-Origin Resource Sharing) menangani request lintas-origin dengan menambah header yang sesuai dan menangani request preflight OPTIONS.

## Penggunaan Dasar

Terapkan middleware CORS memakai middleware bawaan Deserve:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()

// Izinkan semua origin, tangani preflight
router.use(Mware.cors())

await router.serve(8000)
```

## Konfigurasi CORS Khusus

Konfigurasi CORS dengan opsi khusus:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()

// Setel origin, metode, header, dan cache
router.use(
  Mware.cors({
    origin: [
      'http://localhost:3000',
      'https://example.com'
    ],
    methods: [
      'GET',
      'POST',
      'PUT',
      'DELETE'
    ],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Custom-Header'
    ],
    credentials: true,
    maxAge: 3600
  })
)

await router.serve(8000)
```

## Opsi CORS

### `origin`

Tentukan origin yang diizinkan:

```typescript
// Satu origin
origin: 'https://example.com'

// Banyak origin
origin: [
  'https://example.com',
  'https://app.example.com'
]

// Izinkan semua origin (default)
origin: '*'
```

### `methods`

Tentukan metode HTTP yang diizinkan. Default ke ketujuh metode yang didukung:

```typescript
methods: [
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'PATCH',
  'OPTIONS'
]
```

### `allowedHeaders`

Tentukan header yang diizinkan. Default ke `Content-Type`, `Authorization`, dan `X-Requested-With`:

```typescript
allowedHeaders: [
  'Content-Type',
  'Authorization',
  'X-Custom-Header'
]
```

### `exposedHeaders`

Tentukan header yang diekspos ke klien:

```typescript
exposedHeaders: [
  'X-Total-Count',
  'X-Page-Count'
]
```

### `credentials`

Izinkan kredensial dalam request:

```typescript
credentials: true // Izinkan cookie dan header authorization
```

### `maxAge`

Atur durasi cache preflight dalam detik. Default ke `86400` (24 jam):

```typescript
maxAge: 3600 // Cache request preflight selama 1 jam
```

### Default

Setiap opsi punya default, jadi `Mware.cors()` tanpa argumen mengizinkan origin apa pun:

| Opsi             | Default                                            |
| ---------------- | -------------------------------------------------- |
| `origin`         | `'*'`                                              |
| `methods`        | `['DELETE', 'GET', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT']` |
| `allowedHeaders` | `['Content-Type', 'Authorization', 'X-Requested-With']` |
| `exposedHeaders` | `[]`                                               |
| `credentials`    | `false`                                            |
| `maxAge`         | `86400`                                            |

## Cara Kerja

- **Tanpa header Origin** - request lolos tanpa disentuh, karena bukan lintas-origin
- **Preflight OPTIONS** - origin yang cocok mendapat **204 No Content** dengan header CORS. Origin yang tidak cocok juga mendapat **204** tapi tanpa header CORS, jadi browser memblokir request sebenarnya. Event `cors:blocked` menyala untuk origin yang tidak cocok
- **Request sebenarnya** - origin yang cocok menerima `Access-Control-Allow-Origin` plus kredensial dan header yang diekspos saat dikonfigurasi. Origin yang tidak cocok tidak mendapat header CORS dan event `cors:blocked` menyala
- **Header Vary** - `Vary: Origin` ditambahkan setiap kali `origin` bukan wildcard `'*'`, jadi cache tetap benar

## Kredensial dan Wildcard

Mengatur `credentials: true` bersama `origin: '*'` melempar `Deno.errors.InvalidData` saat middleware dibuat, karena browser menolak request berkredensial terhadap origin wildcard. Sebut origin eksplisit saja:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Kredensial butuh origin eksplisit
router.use(
  Mware.cors({
    origin: ['https://app.example.com'],
    credentials: true
  })
)
```

## Header CORS Umum

### Header Request

- `Origin` - Origin yang membuat request
- `Access-Control-Request-Method` - Metode untuk request preflight
- `Access-Control-Request-Headers` - Header untuk request preflight

### Header Response

- `Access-Control-Allow-Origin` - Origin yang diizinkan
- `Access-Control-Allow-Methods` - Metode HTTP yang diizinkan
- `Access-Control-Allow-Headers` - Header request yang diizinkan
- `Access-Control-Allow-Credentials` - Izinkan kredensial
- `Access-Control-Max-Age` - Durasi cache preflight
- `Access-Control-Expose-Headers` - Header yang diekspos ke klien
