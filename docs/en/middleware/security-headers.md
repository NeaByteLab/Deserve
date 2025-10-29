# Security Headers Middleware

> [!WARNING] This feature is available in the development version but not yet released.

> **Reference**: [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)

Security Headers middleware sets HTTP security headers to protect your application from common vulnerabilities like clickjacking, MIME type sniffing, and XSS attacks.

## Basic Usage

Apply security headers middleware using Deserve's built-in middleware:

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

## Route-Specific Security Headers

Apply different security headers to specific routes:

```typescript
// Strict headers for admin routes
router.use('/admin', Mware.securityHeaders({
  xContentTypeOptions: 'nosniff',
  xFrameOptions: 'DENY',
  referrerPolicy: 'no-referrer',
  strictTransportSecurity: 'max-age=31536000; includeSubDomains'
}))

// Less strict for public routes
router.use('/api/public', Mware.securityHeaders({
  xContentTypeOptions: 'nosniff',
  xFrameOptions: 'SAMEORIGIN'
}))
```

## Configuration Options

All headers are optional. Set each header option to a string value to enable it, `false` to disable it explicitly, or leave it `undefined` to skip entirely.

### `contentSecurityPolicy`

Content Security Policy (CSP) to control resource loading:

```typescript
contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'"
```

### `crossOriginEmbedderPolicy`

Cross-Origin Embedder Policy (COEP):

```typescript
crossOriginEmbedderPolicy: 'require-corp'  // or 'unsafe-none', 'credentialless'
```

### `crossOriginOpenerPolicy`

Cross-Origin Opener Policy (COOP):

```typescript
crossOriginOpenerPolicy: 'same-origin'  // or 'same-origin-allow-popups', 'unsafe-none'
```

### `crossOriginResourcePolicy`

Cross-Origin Resource Policy (CORP):

```typescript
crossOriginResourcePolicy: 'same-origin'  // or 'same-site', 'cross-origin'
```

### `originAgentCluster`

Origin Agent Cluster isolation:

```typescript
originAgentCluster: '?1'
```

### `referrerPolicy`

Referrer Policy to control referrer information:

```typescript
referrerPolicy: 'no-referrer'  // or 'strict-origin-when-cross-origin', etc.
```

### `strictTransportSecurity`

HTTP Strict Transport Security (HSTS):

```typescript
strictTransportSecurity: 'max-age=31536000; includeSubDomains'
```

### `xContentTypeOptions`

Prevents MIME type sniffing:

```typescript
xContentTypeOptions: 'nosniff'
```

### `xDnsPrefetchControl`

Controls DNS prefetching:

```typescript
xDnsPrefetchControl: 'off'  // or 'on'
```

### `xDownloadOptions`

Controls file download options:

```typescript
xDownloadOptions: 'noopen'
```

### `xFrameOptions`

Prevents clickjacking attacks:

```typescript
xFrameOptions: 'DENY'  // or 'SAMEORIGIN', 'ALLOW-FROM uri'
```

### `xPermittedCrossDomainPolicies`

Cross-domain policy for Flash:

```typescript
xPermittedCrossDomainPolicies: 'none'  // or 'master-only', 'all'
```

### `xPoweredBy`

Remove or customize X-Powered-By header:

```typescript
xPoweredBy: false  // Remove header
xPoweredBy: 'Custom'  // Set custom value
```

## Complete Example

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

## Important Notes

- **All headers optional**: Headers are only set if you explicitly provide values
- **Set to `false`**: Explicitly disable a header that might be set elsewhere
- **Undefined**: Skip setting the header entirely
- **X-Powered-By**: Set to `false` to remove, string to customize
- **HSTS**: Only use `strictTransportSecurity` on HTTPS servers
- **CSP**: Content Security Policy can be complex - test thoroughly
