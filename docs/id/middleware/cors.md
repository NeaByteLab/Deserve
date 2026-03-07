# Middleware CORS

> **Referensi**: [MDN HTTP CORS Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)

Middleware CORS (Cross-Origin Resource Sharing) mengatur request dari origin lain (domain/port berbeda). Deserve menambah header CORS yang diperlukan dan menangani preflight (request OPTIONS) secara otomatis.

## Penggunaan Dasar

Terapkan middleware CORS menggunakan middleware built-in Deserve:

```typescript
// 1. Import Router dan Mware
import { Router, Mware } from '@neabyte/deserve'

// 2. Buat router
const router = new Router()

// 3. CORS default (semua origin); tangani preflight OPTIONS
router.use(Mware.cors())

// 4. Jalankan server
await router.serve(8000)
```

## Konfigurasi CORS Kustom

Konfigurasi CORS dengan opsi custom:

```typescript
// 1. Import Router dan Mware
import { Router, Mware } from '@neabyte/deserve'

// 2. Buat router
const router = new Router()

// 3. CORS custom: origin, methods, headers, credentials, maxAge
router.use(
  Mware.cors({
    origin: ['http://localhost:3000', 'https://example.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Custom-Header'],
    credentials: true,
    maxAge: 3600
  })
)

// 4. Jalankan server
await router.serve(8000)
```

## Opsi CORS

### `origin`

Tentukan origin yang diizinkan:

```typescript
// Single origin
origin: 'https://example.com'

// Multiple origins
origin: ['https://example.com', 'https://app.example.com']

// Mengizinkan semua origin (default)
origin: '*'
```

### `methods`

Tentukan HTTP methods yang diizinkan:

```typescript
methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
```

### `allowedHeaders`

Tentukan header yang diizinkan:

```typescript
allowedHeaders: ['Content-Type', 'Authorization', 'X-Custom-Header']
```

### `exposedHeaders`

Tentukan header yang diekspos ke client:

```typescript
exposedHeaders: ['X-Total-Count', 'X-Page-Count']
```

### `credentials`

Izinkan credentials dalam requests:

```typescript
credentials: true // Izinkan cookies dan authorization headers
```

### `maxAge`

Set durasi cache preflight dalam detik:

```typescript
maxAge: 3600 // Cache preflight requests selama 1 jam
```

## Contoh Lengkap

```typescript
// 1. Import Router dan Mware
import { Router, Mware } from '@neabyte/deserve'

// 2. Buat router
const router = new Router({ routesDir: './routes' })

// 3. CORS siap produksi: origin, methods, headers, credentials, maxAge
router.use(
  Mware.cors({
    origin: ['http://localhost:3000', 'http://localhost:5173', 'https://yourdomain.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Custom-Header'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    credentials: true,
    maxAge: 3600
  })
)

// 4. Jalankan server
await router.serve(8000)
```

## Header CORS Umum

### Request Headers

- `Origin` - Origin yang membuat request
- `Access-Control-Request-Method` - Method untuk preflight requests
- `Access-Control-Request-Headers` - Headers untuk preflight requests

### Response Headers

- `Access-Control-Allow-Origin` - Origin yang diizinkan
- `Access-Control-Allow-Methods` - HTTP methods yang diizinkan
- `Access-Control-Allow-Headers` - Request headers yang diizinkan
- `Access-Control-Allow-Credentials` - Izinkan credentials
- `Access-Control-Max-Age` - Durasi cache preflight
- `Access-Control-Expose-Headers` - Headers yang diekspos ke client
