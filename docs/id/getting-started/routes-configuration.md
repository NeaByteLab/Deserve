# Konfigurasi Rute

Konfigurasi direktori routes Deserve agar sesuai dengan struktur proyek Anda.

## Opsi Router

Konstruktor `Router` menerima opsi konfigurasi. Opsi utama: `routesDir` (direktori file route), `requestTimeoutMs` (timeout request), serta opsional `errorResponseBuilder` / `staticHandler`.

```typescript
// 1. Import Router
import { Router } from '@neabyte/deserve'

// 2. routesDir custom dan opsional request timeout (default: ./routes, tanpa timeout)
const router = new Router({
  routesDir: 'src/routes',
  requestTimeoutMs: 30_000
})
```

## Opsi Konfigurasi

### `routesDir`

Direktori yang berisi file route Anda:

```typescript
// 1. Default: routes dari ./routes
const router = new Router()

// 2. Custom: routes dari ./src/api
const router = new Router({
  routesDir: 'src/api'
})
```

### `requestTimeoutMs`

Opsi timeout dalam milidetik untuk seluruh request (middleware + route handler). Jika terlampaui, server merespons **503 Service Unavailable**. Omit atau biarkan undefined untuk tanpa timeout.

```typescript
const router = new Router({
  routesDir: 'routes',
  requestTimeoutMs: 30_000
})
```

### `maxIterations`

Jumlah maksimum iterasi yang diizinkan per blok <code v-pre>{{#each}}</code> di template DVE. Mencegah event loop starvation dari rendering template tanpa batas. Default adalah `100_000`. Jika terlampaui, engine akan throw dan server merespons **500 Internal Server Error**.

```typescript
const router = new Router({
  routesDir: 'routes',
  viewsDir: './views',
  maxIterations: 50_000
})
```

Untuk dataset lebih besar dari limit, gunakan [`streamRender`](/id/rendering/streaming). Untuk rendering yang CPU-intensive, pertimbangkan untuk offload ke [worker pool](/id/core-concepts/worker-pool).

## Ekstensi File Yang Didukung

Deserve secara otomatis mendeteksi dan mendukung ekstensi file ini:

- `.ts` (TypeScript)
- `.js` (JavaScript)
- `.tsx` (TypeScript dengan JSX)
- `.jsx` (JavaScript dengan JSX)
- `.mjs` (ES Modules)
- `.cjs` (CommonJS)

Anda tidak perlu mengonfigurasi ekstensi - Deserve secara otomatis mendeteksinya.

## Path Absolut Dan Relatif

### Relative Paths

```typescript
// 1. Path relatif terhadap CWD
const router = new Router({
  routesDir: 'routes'
})
```

### Absolute Paths

```typescript
// 1. Pakai Deno.cwd() untuk base absolut
const router = new Router({
  routesDir: `${Deno.cwd()}/routes`
})
```

```typescript
// 2. Atau path absolut literal
const router = new Router({
  routesDir: '/absolute/path/to/routes'
})
```
