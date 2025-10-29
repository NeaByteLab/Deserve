# Konfigurasi Rute

Konfigurasi direktori routes Deserve agar sesuai dengan struktur proyek Anda.

## Router Options

Konstruktor `Router` menerima opsi konfigurasi:

```typescript
import { Router } from '@neabyte/deserve'

const router = new Router({
  routesDir: 'src/routes'
})
```

## Opsi Konfigurasi

### `routesDir`

Direktori yang berisi file route Anda:

```typescript
// Default - menggunakan './routes'
const router = new Router()

// Direktori custom - Menggunakan './src/api'
const router = new Router({
  routesDir: 'src/api'
})
```

## Ekstensi File yang Didukung

Deserve secara otomatis mendeteksi dan mendukung ekstensi file ini:

- `.ts` (TypeScript)
- `.js` (JavaScript)
- `.tsx` (TypeScript dengan JSX)
- `.jsx` (JavaScript dengan JSX)
- `.mjs` (ES Modules)
- `.cjs` (CommonJS)

Anda tidak perlu mengonfigurasi ekstensi - Deserve secara otomatis mendeteksinya.

## Absolute vs Relative Paths

### Relative Paths
```typescript
const router = new Router({
  routesDir: 'routes'
})
```

### Absolute Paths

```typescript
const router = new Router({
  routesDir: `${Deno.cwd()}/routes`
})
```

```typescript
const router = new Router({
  routesDir: '/absolute/path/to/routes'
})
```

