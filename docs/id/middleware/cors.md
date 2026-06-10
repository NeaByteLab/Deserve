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

Tentukan metode HTTP yang diizinkan:

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

Tentukan header yang diizinkan:

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

Atur durasi cache preflight dalam detik:

```typescript
maxAge: 3600 // Cache request preflight selama 1 jam
```

### Default

Setiap opsi punya default, jadi `Mware.cors()` tanpa argumen mengizinkan origin apa pun:

| Opsi             | Default                                            |
| ---------------- | -------------------------------------------------- |
| `origin`         | `'*'`                                              |
| `methods`        | semua metode HTTP                                  |
| `allowedHeaders` | `['Content-Type', 'Authorization', 'X-Requested-With']` |
| `exposedHeaders` | `[]`                                               |
| `credentials`    | `false`                                            |
| `maxAge`         | `86400`                                            |

## Cara Kerja

- **Tanpa header Origin** - request lolos tanpa disentuh, karena bukan lintas-origin.
- **Preflight OPTIONS** - origin yang cocok mendapat **204 No Content** dengan header CORS, dan origin yang tidak cocok mendapat **403 Forbidden**.
- **Request sebenarnya** - origin yang cocok menerima `Access-Control-Allow-Origin` plus kredensial dan header yang diekspos saat dikonfigurasi.
- **Header Vary** - `Vary: Origin` ditambahkan setiap kali `origin` bukan wildcard `'*'`, jadi cache tetap benar.

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

## Contoh Lengkap

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router({
  routesDir: './routes'
})

// CORS produksi dengan opsi lengkap
router.use(
  Mware.cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://yourdomain.com'
    ],
    methods: [
      'GET',
      'POST',
      'PUT',
      'DELETE',
      'PATCH',
      'OPTIONS'
    ],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Custom-Header'
    ],
    exposedHeaders: [
      'X-Total-Count',
      'X-Page-Count'
    ],
    credentials: true,
    maxAge: 3600
  })
)

await router.serve(8000)
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
