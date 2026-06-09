---
description: "Terapkan header response keamanan umum dengan middleware security headers Deserve."
---

# Middleware Security Headers

> **Referensi**: [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)

Middleware Security Headers mengatur header keamanan HTTP yang melindungi aplikasi dari kerentanan umum seperti clickjacking, MIME type sniffing, dan serangan XSS. Aman secara bawaan, jadi memanggilnya tanpa opsi sudah menerapkan baseline yang kuat.

## Penggunaan Dasar

Memanggil `Mware.securityHeaders()` tanpa opsi menerapkan default yang aman:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()

// Terapkan header default yang aman
router.use(Mware.securityHeaders())

await router.serve(8000)
```

Default mengatur header ini pada setiap response:

| Header                              | Nilai default  |
| ----------------------------------- | -------------- |
| `Cross-Origin-Opener-Policy`        | `same-origin`  |
| `Cross-Origin-Resource-Policy`      | `same-origin`  |
| `Origin-Agent-Cluster`              | `?1`           |
| `Referrer-Policy`                   | `no-referrer`  |
| `X-Content-Type-Options`            | `nosniff`      |
| `X-DNS-Prefetch-Control`            | `off`          |
| `X-Download-Options`                | `noopen`       |
| `X-Frame-Options`                   | `SAMEORIGIN`   |
| `X-Permitted-Cross-Domain-Policies` | `none`         |

Berikan opsi untuk menimpa default atau mengaktifkan header yang mati sampai dikonfigurasi:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Timpa default di mana perlu
router.use(
  Mware.securityHeaders({
    xFrameOptions: 'DENY',
    strictTransportSecurity: 'max-age=31536000; includeSubDomains'
  })
)
```

## Security Headers Spesifik Rute

Terapkan security header berbeda ke rute tertentu:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Header ketat untuk rute admin
router.use(
  '/admin',
  Mware.securityHeaders({
    xContentTypeOptions: 'nosniff',
    xFrameOptions: 'DENY',
    referrerPolicy: 'no-referrer',
    strictTransportSecurity: 'max-age=31536000; includeSubDomains'
  })
)

// Lebih longgar untuk rute publik
router.use(
  '/api/public',
  Mware.securityHeaders({
    xContentTypeOptions: 'nosniff',
    xFrameOptions: 'SAMEORIGIN'
  })
)
```

## Opsi Konfigurasi

Setiap opsi header punya tiga bentuk. Nilai string mengatur header ke nilai itu. `false` menghilangkan header, bahkan yang punya default aman. Membiarkan opsi `undefined` mempertahankan default-nya ketika ada, atau melewatinya jika tidak. Empat header tanpa default - `contentSecurityPolicy`, `crossOriginEmbedderPolicy`, `strictTransportSecurity`, dan `xPoweredBy` - mati sampai sebuah nilai diberikan.

### `contentSecurityPolicy`

Content Security Policy (CSP) untuk mengontrol pemuatan resource:

```typescript
contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'"
```

### `crossOriginEmbedderPolicy`

Cross-Origin Embedder Policy (COEP):

```typescript
crossOriginEmbedderPolicy: 'require-corp' // atau 'unsafe-none', 'credentialless'
```

### `crossOriginOpenerPolicy`

Cross-Origin Opener Policy (COOP):

```typescript
crossOriginOpenerPolicy: 'same-origin' // atau 'same-origin-allow-popups', 'unsafe-none'
```

### `crossOriginResourcePolicy`

Cross-Origin Resource Policy (CORP):

```typescript
crossOriginResourcePolicy: 'same-origin' // atau 'same-site', 'cross-origin'
```

### `originAgentCluster`

Isolasi Origin Agent Cluster:

```typescript
originAgentCluster: '?1'
```

### `referrerPolicy`

Referrer Policy untuk mengontrol info referrer:

```typescript
referrerPolicy: 'no-referrer' // atau 'strict-origin-when-cross-origin', dll.
```

### `strictTransportSecurity`

HTTP Strict Transport Security (HSTS):

```typescript
strictTransportSecurity: 'max-age=31536000; includeSubDomains'
```

### `xContentTypeOptions`

Mencegah MIME type sniffing:

```typescript
xContentTypeOptions: 'nosniff'
```

### `xDnsPrefetchControl`

Mengontrol prefetch DNS:

```typescript
xDnsPrefetchControl: 'off' // atau 'on'
```

### `xDownloadOptions`

Mengontrol opsi unduhan berkas:

```typescript
xDownloadOptions: 'noopen'
```

### `xFrameOptions`

Mencegah serangan clickjacking:

```typescript
xFrameOptions: 'DENY' // atau 'SAMEORIGIN', 'ALLOW-FROM uri'
```

### `xPermittedCrossDomainPolicies`

Kebijakan lintas-domain untuk Flash:

```typescript
xPermittedCrossDomainPolicies: 'none' // atau 'master-only', 'all'
```

### `xPoweredBy`

Mati secara bawaan. Atur string untuk mengiklankan nilai, atau biarkan untuk tanpa header:

```typescript
xPoweredBy: 'Custom' // Tambah nilai khusus
```

## Contoh Lengkap

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router({ routesDir: './routes' })

// Terapkan set header yang luas
router.use(
  Mware.securityHeaders({
    xContentTypeOptions: 'nosniff',
    xFrameOptions: 'DENY',
    referrerPolicy: 'no-referrer',
    xDnsPrefetchControl: 'off',
    strictTransportSecurity: 'max-age=31536000; includeSubDomains',
    contentSecurityPolicy: "default-src 'self'",
    crossOriginOpenerPolicy: 'same-origin',
    crossOriginResourcePolicy: 'same-origin'
  })
)

await router.serve(8000)
```

## Catatan Penting

- **Aman secara bawaan**: memanggil middleware tanpa opsi sudah menerapkan sembilan header baseline
- **Nilai string**: mengatur header ke nilai persis itu, menimpa default mana pun
- **Diatur ke `false`**: menghilangkan header, bahkan yang punya default
- **Undefined**: mempertahankan default ketika header punya satu, jika tidak melewatinya
- **X-Powered-By**: mati secara bawaan, atur string untuk menambahnya atau biarkan untuk tanpa header
- **HSTS**: terapkan `strictTransportSecurity` hanya pada server HTTPS
- **CSP**: Content Security Policy bisa jadi kompleks, jadi uji dengan teliti
