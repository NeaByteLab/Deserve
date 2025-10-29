# Middleware CORS

Middleware CORS (Cross-Origin Resource Sharing) menangani cross-origin requests dengan menambahkan header yang sesuai dan menangani preflight OPTIONS requests.

## Penggunaan Dasar

Terapkan middleware CORS menggunakan middleware built-in Deserve:

```typescript
import { Router, Mware } from '@neabyte/deserve'

const router = new Router()

// Terapkan CORS dengan pengaturan default (mengizinkan semua origin)
router.use(Mware.cors())

await router.serve(8000)
```

## Konfigurasi CORS Custom

Konfigurasi CORS dengan opsi custom:

```typescript
import { Router, Mware } from '@neabyte/deserve'

const router = new Router()

router.use(
  Mware.cors({
    origin: ['http://localhost:3000', 'https://example.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Custom-Header'],
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
import { Router, Mware } from '@neabyte/deserve'

const router = new Router({ routesDir: './routes' })

// Terapkan middleware CORS dengan konfigurasi siap produksi
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

