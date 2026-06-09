---
description: "Konfigurasi direktori routes, batas parameter, dan timeout request di Router Deserve."
---

# Konfigurasi Rute

Konfigurasi direktori routes Deserve agar cocok dengan struktur proyek.

## Opsi Router

Konstruktor `Router` menerima opsi konfigurasi. Yang umum adalah `routesDir` untuk folder rute dan `requestTimeoutMs` untuk timeout request. Rendering, batas request, worker pool, dan builder error khusus semuanya bisa dikonfigurasi juga. Kepercayaan proxy lewat `trustProxy` dan worker pool ada di [Resolusi IP Klien](/id/getting-started/server-configuration#resolusi-ip-klien) dan [Worker Pool](/id/core-concepts/worker-pool).

```typescript twoslash
import { Router } from '@neabyte/deserve'

// Folder rute dan timeout khusus
const router = new Router({
  routesDir: 'src/routes',
  requestTimeoutMs: 30_000
})
```

## Opsi Konfigurasi

### `routesDir`

Direktori yang berisi berkas rute:

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
// Default ke ./routes
const defaultRouter = new Router()

// Baca rute dari ./src/api
const router = new Router({
  routesDir: 'src/api'
})
```

### `requestTimeoutMs`

Timeout opsional dalam milidetik untuk seluruh request (middleware + route handler). Jika terlampaui, server membalas dengan **503 Service Unavailable**. Hilangkan atau biarkan undefined untuk tanpa timeout.

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  routesDir: 'routes',
  requestTimeoutMs: 30_000
})
```

### `maxIterations`

Iterasi maksimum yang diizinkan per blok <code v-pre>{{#each}}</code> di template DVE. Batas ini mencegah event loop kelaparan akibat rendering tak terbatas. Default-nya `100_000`, dan melampauinya membuat mesin melempar sehingga server membalas dengan **500 Internal Server Error**.

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  routesDir: 'routes',
  viewsDir: './views',
  maxIterations: 50_000
})
```

Untuk dataset lebih besar dari batas, gunakan [`streamRender`](/id/rendering/streaming), dan lihat [Performa dan Batas](/id/rendering/performance#batas-iterasi) untuk perilaku batasnya. Untuk rendering berat CPU, pertimbangkan mengalihkan ke [worker pool](/id/core-concepts/worker-pool).

### `maxUrlLength`

Panjang maksimum URL request dalam karakter. URL lebih panjang ditolak dengan **414 URI Too Long** sebelum rute mana pun berjalan. Default-nya `8192`:

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  routesDir: 'routes',
  maxUrlLength: 4096
})
```

### `maxParamLength`

Panjang maksimum satu nilai parameter rute. Nilai lebih panjang ditolak dengan **414 URI Too Long**. Default-nya `1024`:

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  routesDir: 'routes',
  maxParamLength: 512
})
```

### `errorResponseBuilder`

Opsi lanjutan yang mengganti cara response error dibangun. Ia menerima context, status code, error, dan handler yang diatur dengan [`router.catch()`](/id/error-handling/object-details), lalu mengembalikan `Response` final. Kebanyakan aplikasi membentuk error lewat `router.catch()` saja, dibahas di [Penanganan Error](/id/error-handling/object-details):

```typescript twoslash
import type { Context, ErrorMiddleware } from '@neabyte/deserve'
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  routesDir: 'routes',
  errorResponseBuilder: {
    // Bangun response error khusus
    async build(
      ctx: Context,
      statusCode: number,
      error: Error,
      errorMiddleware?: ErrorMiddleware
    ) {
      return ctx.send.json(
        {
          failed: true,
          statusCode
        },
        { status: statusCode }
      )
    }
  }
})
```

## Ekstensi Berkas yang Didukung

Deserve otomatis mendeteksi dan mendukung ekstensi berkas ini:

- `.ts` (TypeScript)
- `.js` (JavaScript)
- `.tsx` (TypeScript dengan JSX)
- `.jsx` (JavaScript dengan JSX)
- `.mjs` (ES Modules)
- `.cjs` (CommonJS)

Tidak perlu konfigurasi tambahan, karena Deserve mendeteksinya otomatis.

## Path Absolut vs Relatif

### Path Relatif

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  routesDir: 'routes'
})
```

### Path Absolut

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  routesDir: `${Deno.cwd()}/routes`
})
```

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  routesDir: '/absolute/path/to/routes'
})
```
