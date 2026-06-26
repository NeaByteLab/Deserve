---
description: "Konfigurasi direktori routes, batas parameter, dan timeout request di Router Deserve."
---

# Konfigurasi Routes

Konfigurasi direktori routes Deserve agar cocok dengan struktur proyek. Setiap opsi berada di objek `RouterOptions` yang dioper ke `new Router(...)`.

## Opsi Router

Konstruktor `Router` menerima satu objek opsi. Pasangan sehari-hari adalah `routes.directory` untuk folder rute dan `timeoutMs` untuk tenggat request. Bagian di bawah membahas pemuatan rute, batas ukuran request, batas render template, dan dua kait lanjutan `trustProxy` serta `worker`. Dua opsi terkait ada di halaman sendiri, `trustProxy` di [Resolusi IP Klien](/id/getting-started/server-configuration#resolusi-ip-klien) dan `worker` pool di [Worker Pool](/id/recipes/worker-pool).

```typescript twoslash
import { Router } from '@neabyte/deserve'

// Folder rute dan timeout khusus
const router = new Router({
  routes: {
    directory: './src/routes'
  },
  timeoutMs: 30_000
})
```

## routes

### `routes.directory`

Direktori yang berisi berkas rute. Default ke `./routes`:

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
// Default ke ./routes
const defaultRouter = new Router()

// Baca rute dari ./src/api
const router = new Router({
  routes: {
    directory: './src/api'
  }
})
```

### `routes.maxParamLength`

Panjang maksimum satu nilai parameter rute. Nilai lebih panjang ditolak dengan **414 URI Too Long**. Default-nya `1024`:

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  routes: {
    directory: './routes',
    maxParamLength: 512
  }
})
```

## views

### `views.directory`

Direktori yang berisi berkas template DVE. Default ke `./views`. Ketika dihilangkan, `ctx.render()` melempar karena tidak ada view engine yang dikonfigurasi:

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  routes: {
    directory: './routes'
  },
  views: {
    directory: './views'
  }
})
```

### `views.maxIterations`

Iterasi maksimum yang diizinkan per blok <code v-pre>{{#each}}</code> di template DVE. Batas ini mencegah event loop kelaparan akibat satu perulangan tak terbatas. Default-nya `100_000`, dan melampauinya membuat mesin melempar sehingga server membalas dengan **400 Bad Request**.

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  routes: {
    directory: './routes'
  },
  views: {
    directory: './views',
    maxIterations: 50_000
  }
})
```

Untuk dataset lebih besar dari batas, gunakan [`ctx.render`](/id/core-concepts/context-object#merender-template) dengan `stream: true`, dan lihat [Performa dan Batas](/id/rendering/performance#batas-iterasi) untuk perilaku batasnya. Untuk rendering berat CPU, pertimbangkan mengalihkan ke [worker pool](/id/recipes/worker-pool).

### `views.maxRenderIterations`

Total maksimum eksekusi badan <code v-pre>{{#each}}</code> dalam satu render, dijumlahkan dari setiap perulangan termasuk yang bersarang. Jika `maxIterations` membatasi satu perulangan, opsi ini membatasi seluruh halaman. Default-nya `1_000_000`, dan melampauinya membalas dengan **400 Bad Request**.

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  routes: {
    directory: './routes'
  },
  views: {
    directory: './views',
    maxRenderIterations: 500_000
  }
})
```

### `views.maxOutputSize`

Total maksimum karakter keluaran yang dihasilkan satu render. Batas ini mencegah template kecil membengkak menjadi response besar. Default-nya `5_000_000`, dan melampauinya membalas dengan **400 Bad Request**.

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  routes: {
    directory: './routes'
  },
  views: {
    directory: './views',
    maxOutputSize: 1_000_000
  }
})
```

### `views.maxTemplateSize`

Ukuran maksimum satu berkas template dalam karakter. Batas ini mencegah template berukuran berlebih menghabiskan memori sebelum dikompilasi. Default-nya `1_000_000`, diatur oleh [DVE engine](https://jsr.io/@neabyte/dve), dan melampauinya membalas dengan **400 Bad Request**. Batas sama berlaku ke setiap berkas include atau layout yang diresolusi mesin.

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  routes: {
    directory: './routes'
  },
  views: {
    directory: './views',
    maxTemplateSize: 500_000
  }
})
```

## maxUrlLength

Panjang maksimum URL request dalam karakter. URL lebih panjang ditolak dengan **414 URI Too Long** sebelum rute mana pun berjalan. Default-nya `8192`:

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  maxUrlLength: 4096
})
```

## timeoutMs

Timeout opsional dalam milidetik untuk seluruh request (middleware + route handler). Jika terlampaui, server membalas dengan **503 Service Unavailable**. Hilangkan atau biarkan undefined untuk tanpa timeout. Lihat juga [Konfigurasi Server](/id/getting-started/server-configuration#request-timeout):

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  routes: {
    directory: './routes'
  },
  timeoutMs: 30_000
})
```

## hotReload

Mengaktifkan atau menonaktifkan pemantauan berkas untuk routes dan views. Default ke `true`. Set ke `false` untuk menonaktifkan [hot reload](/id/core-concepts/hot-reload) sepenuhnya, yang cocok untuk deployment produksi di mana pemantauan berkas tidak diperlukan:

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  hotReload: false
})
```

## trustProxy

Mengontrol cara IP klien asli diresolusi di balik proxy atau load balancer. Lihat [Resolusi IP Klien](/id/getting-started/server-configuration#resolusi-ip-klien) untuk panduan lengkapnya.

## worker

Mengonfigurasi worker pool untuk mengalihkan pekerjaan berat CPU. Lihat [Worker Pool](/id/recipes/worker-pool) untuk panduan lengkapnya.

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
  routes: {
    directory: './routes'
  }
})
```

### Path Absolut

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  routes: {
    directory: `${Deno.cwd()}/routes`
  }
})
```

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  routes: {
    directory: '/absolute/path/to/routes'
  }
})
```
