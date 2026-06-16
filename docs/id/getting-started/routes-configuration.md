---
description: "Konfigurasi direktori routes, batas parameter, dan timeout request di Router Deserve."
---

# Konfigurasi Rute

Konfigurasi direktori routes Deserve agar cocok dengan struktur proyek.

## Opsi Router

Konstruktor `Router` menerima satu objek opsi. Pasangan sehari-hari adalah `routesDir` untuk folder rute dan `requestTimeoutMs` untuk tenggat request. Bagian di bawah membahas pemuatan rute, batas ukuran request, batas render template, dan dua kait lanjutan `errorResponseBuilder` serta `staticHandler`. Dua opsi terkait ada di halaman sendiri, `trustProxy` di [Resolusi IP Klien](/id/getting-started/server-configuration#resolusi-ip-klien) dan `worker` pool di [Worker Pool](/id/core-concepts/worker-pool).

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

Iterasi maksimum yang diizinkan per blok <code v-pre>{{#each}}</code> di template DVE. Batas ini mencegah event loop kelaparan akibat satu perulangan tak terbatas. Default-nya `100_000`, dan melampauinya membuat mesin melempar sehingga server membalas dengan **400 Bad Request**.

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

### `maxRenderIterations`

Total maksimum eksekusi badan <code v-pre>{{#each}}</code> dalam satu render, dijumlahkan dari setiap perulangan termasuk yang bersarang. Jika `maxIterations` membatasi satu perulangan, opsi ini membatasi seluruh halaman. Default-nya `1_000_000`, dan melampauinya membalas dengan **400 Bad Request**.

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  routesDir: 'routes',
  viewsDir: './views',
  maxRenderIterations: 500_000
})
```

### `maxOutputSize`

Total maksimum karakter keluaran yang dihasilkan satu render. Batas ini mencegah template kecil membengkak menjadi response besar. Default-nya `5_000_000`, dan melampauinya membalas dengan **400 Bad Request**.

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  routesDir: 'routes',
  viewsDir: './views',
  maxOutputSize: 1_000_000
})
```

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

Opsi lanjutan yang mengganti cara response error dibangun. Opsi ini menerima context, status code, error, dan handler yang diatur dengan [`router.catch()`](/id/error-handling/object-details), lalu mengembalikan `Response` final. Kebanyakan aplikasi membentuk error lewat `router.catch()` saja, dibahas di [Penanganan Error](/id/error-handling/object-details):

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
      errorMiddleware: ErrorMiddleware | null
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

### `staticHandler`

Opsi lanjutan yang mengganti cara berkas statis dilayani. Opsi ini menerima context, [opsi statis](/id/static-file/basic#opsi-static-file) untuk rute yang cocok, dan path URL, lalu mengembalikan `Response`. Implementasi default sudah menjaga path traversal, jadi ganti hanya untuk backend khusus seperti object storage:

```typescript twoslash
import type { Context, ServeOptions } from '@neabyte/deserve'
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  routesDir: 'routes',
  staticHandler: {
    // Layani berkas dari backend khusus
    async serve(ctx: Context, options: ServeOptions, urlPath: string) {
      return ctx.send.text(`requested ${urlPath}`)
    }
  }
})
```

Daftarkan rute statisnya sendiri dengan [`router.static()`](/id/static-file/basic), yang lalu dipenuhi handler ini.

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
