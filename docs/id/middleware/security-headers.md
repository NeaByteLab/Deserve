# Middleware Security Headers

> **Referensi**: [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)

Middleware Security Headers mengatur header keamanan HTTP untuk melindungi aplikasi Anda dari kerentanan umum seperti clickjacking, MIME type sniffing, dan serangan XSS.

## Penggunaan Dasar

Terapkan middleware security headers menggunakan middleware built-in Deserve:

```typescript
import { Router, Mware } from '@neabyte/deserve'

const router = new Router()

router.use(Mware.securityHeaders({
  xContentTypeOptions: 'nosniff',
  xFrameOptions: 'DENY',
  referrerPolicy: 'no-referrer'
}))

await router.serve(8000)
```

## Security Headers Spesifik Rute

Terapkan security headers berbeda pada route tertentu:

```typescript
// Header ketat untuk route admin
router.use('/admin', Mware.securityHeaders({
  xContentTypeOptions: 'nosniff',
  xFrameOptions: 'DENY',
  referrerPolicy: 'no-referrer',
  strictTransportSecurity: 'max-age=31536000; includeSubDomains'
}))

// Kurang ketat untuk route publik
router.use('/api/public', Mware.securityHeaders({
  xContentTypeOptions: 'nosniff',
  xFrameOptions: 'SAMEORIGIN'
}))
```

## Opsi Konfigurasi

Semua header bersifat opsional. Setiap opsi header dapat diatur ke nilai string untuk mengaktifkannya, `false` untuk menonaktifkannya secara eksplisit, atau biarkan `undefined` untuk melewatkannya sepenuhnya.

### `contentSecurityPolicy`

Content Security Policy (CSP) untuk mengontrol pemuatan resource:

```typescript
contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'"
```

### `crossOriginEmbedderPolicy`

Cross-Origin Embedder Policy (COEP):

```typescript
crossOriginEmbedderPolicy: 'require-corp'  // atau 'unsafe-none', 'credentialless'
```

### `crossOriginOpenerPolicy`

Cross-Origin Opener Policy (COOP):

```typescript
crossOriginOpenerPolicy: 'same-origin'  // atau 'same-origin-allow-popups', 'unsafe-none'
```

### `crossOriginResourcePolicy`

Cross-Origin Resource Policy (CORP):

```typescript
crossOriginResourcePolicy: 'same-origin'  // atau 'same-site', 'cross-origin'
```

### `originAgentCluster`

Isolasi Origin Agent Cluster:

```typescript
originAgentCluster: '?1'
```

### `referrerPolicy`

Referrer Policy untuk mengontrol informasi referrer:

```typescript
referrerPolicy: 'no-referrer'  // atau 'strict-origin-when-cross-origin', dll.
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

Mengontrol DNS prefetching:

```typescript
xDnsPrefetchControl: 'off'  // atau 'on'
```

### `xDownloadOptions`

Mengontrol opsi unduhan file:

```typescript
xDownloadOptions: 'noopen'
```

### `xFrameOptions`

Mencegah serangan clickjacking:

```typescript
xFrameOptions: 'DENY'  // atau 'SAMEORIGIN', 'ALLOW-FROM uri'
```

### `xPermittedCrossDomainPolicies`

Kebijakan cross-domain untuk Flash:

```typescript
xPermittedCrossDomainPolicies: 'none'  // atau 'master-only', 'all'
```

### `xPoweredBy`

Hapus atau kustomisasi header X-Powered-By:

```typescript
xPoweredBy: false  // Hapus header
xPoweredBy: 'Custom'  // Atur nilai kustom
```

## Contoh Lengkap

```typescript
import { Router, Mware } from '@neabyte/deserve'

const router = new Router({ routesDir: './routes' })

router.use(Mware.securityHeaders({
  xContentTypeOptions: 'nosniff',
  xFrameOptions: 'DENY',
  referrerPolicy: 'no-referrer',
  xDnsPrefetchControl: 'off',
  strictTransportSecurity: 'max-age=31536000; includeSubDomains',
  contentSecurityPolicy: "default-src 'self'",
  crossOriginOpenerPolicy: 'same-origin',
  crossOriginResourcePolicy: 'same-origin'
}))

await router.serve(8000)
```

## Catatan Penting

- **Semua header opsional**: Header hanya diatur jika Anda secara eksplisit memberikan nilai
- **Set ke `false`**: Secara eksplisit menonaktifkan header yang mungkin diatur di tempat lain
- **Undefined**: Lewati pengaturan header sepenuhnya
- **X-Powered-By**: Set ke `false` untuk menghapus, string untuk menyesuaikan
- **HSTS**: Hanya gunakan `strictTransportSecurity` pada server HTTPS
- **CSP**: Content Security Policy bisa kompleks - uji dengan teliti

