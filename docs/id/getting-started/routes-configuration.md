# Konfigurasi Rute

Konfigurasi direktori routes Deserve agar sesuai dengan struktur proyek Anda.

## Opsi Router

Konstruktor `Router` menerima opsi konfigurasi. Opsi utama yang sering dipakai adalah `routesDir` (direktori tempat file route Anda):

```typescript
// 1. Import Router
import { Router } from '@neabyte/deserve'

// 2. Beri routesDir custom (default: ./routes)
const router = new Router({
  routesDir: 'src/routes'
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
