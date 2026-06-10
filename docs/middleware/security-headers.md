---
description: "Apply common security response headers with the Deserve security headers middleware."
---

# Security Headers Middleware

> **Reference**: [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)

Security Headers middleware sets HTTP security headers that protect the application from common vulnerabilities like clickjacking, MIME type sniffing, and XSS attacks. It is secure by default, so calling it with no options already applies a strong baseline.

## Basic Usage

Calling `Mware.securityHeaders()` with no options applies the secure defaults:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()

// Apply secure default headers
router.use(Mware.securityHeaders())

await router.serve(8000)
```

The defaults set these headers on every response:

| Header                              | Default value  |
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

Pass options to override a default or to enable headers that stay off until configured:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Override defaults where needed
router.use(
  Mware.securityHeaders({
    xFrameOptions: 'DENY',
    strictTransportSecurity: 'max-age=31536000; includeSubDomains'
  })
)
```

## Route-Specific Security Headers

Apply different security headers to specific routes:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Strict headers for admin routes
router.use(
  '/admin',
  Mware.securityHeaders({
    xContentTypeOptions: 'nosniff',
    xFrameOptions: 'DENY',
    referrerPolicy: 'no-referrer',
    strictTransportSecurity: 'max-age=31536000; includeSubDomains'
  })
)

// Less strict for public routes
router.use(
  '/api/public',
  Mware.securityHeaders({
    xContentTypeOptions: 'nosniff',
    xFrameOptions: 'SAMEORIGIN'
  })
)
```

## Configuration Options

Each header option takes three forms. A string value sets the header to that value. `false` omits the header, even one that has a secure default. Leaving an option `undefined` keeps its default when it has one, or skips it otherwise. The four headers without a default - `contentSecurityPolicy`, `crossOriginEmbedderPolicy`, `strictTransportSecurity`, and `xPoweredBy` - stay off until a value is given.

### `contentSecurityPolicy`

Content Security Policy (CSP) to control resource loading:

```typescript
contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'"
```

### `crossOriginEmbedderPolicy`

Cross-Origin Embedder Policy (COEP):

```typescript
crossOriginEmbedderPolicy: 'require-corp' // or 'unsafe-none', 'credentialless'
```

### `crossOriginOpenerPolicy`

Cross-Origin Opener Policy (COOP):

```typescript
crossOriginOpenerPolicy: 'same-origin' // or 'same-origin-allow-popups', 'unsafe-none'
```

### `crossOriginResourcePolicy`

Cross-Origin Resource Policy (CORP):

```typescript
crossOriginResourcePolicy: 'same-origin' // or 'same-site', 'cross-origin'
```

### `originAgentCluster`

Origin Agent Cluster isolation:

```typescript
originAgentCluster: '?1'
```

### `referrerPolicy`

Referrer Policy to control referrer information:

```typescript
referrerPolicy: 'no-referrer' // or 'strict-origin-when-cross-origin', etc.
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
xDnsPrefetchControl: 'off' // or 'on'
```

### `xDownloadOptions`

Controls file download options:

```typescript
xDownloadOptions: 'noopen'
```

### `xFrameOptions`

Prevents clickjacking attacks:

```typescript
xFrameOptions: 'DENY' // or 'SAMEORIGIN', 'ALLOW-FROM uri'
```

### `xPermittedCrossDomainPolicies`

Cross-domain policy for Flash:

```typescript
xPermittedCrossDomainPolicies: 'none' // or 'master-only', 'all'
```

### `xPoweredBy`

Off by default. Set a string to advertise a value, or leave it for no header:

```typescript
xPoweredBy: 'Custom' // Add a custom value
```

## Complete Example

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router({
  routesDir: './routes'
})

// Apply a broad set of headers
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

## Important Notes

- **Secure by default**: calling the middleware with no options already applies nine baseline headers
- **String value**: sets the header to that exact value, overriding any default
- **Set to `false`**: omits the header, even one that has a default
- **Undefined**: keeps the default when the header has one, otherwise skips it
- **X-Powered-By**: off by default, set a string to add it or leave it for no header
- **HSTS**: apply `strictTransportSecurity` only on HTTPS servers
- **CSP**: Content Security Policy can grow complex, so test it thoroughly
