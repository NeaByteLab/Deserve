---
description: "Why Deserve has no HTTPS redirect middleware, since TLS belongs at the edge and a forced redirect at the app can loop."
---

# HTTPS Redirect

Deserve has no HTTPS redirect middleware, and forcing one inside the app is the wrong layer for the job. TLS is terminated at the edge, so the application rarely sees the original scheme to begin with.

## Why It Is Not Built In

A forced HTTPS redirect sends any `http://` request back as `https://`. The trouble is where TLS actually lives. In production the certificate sits on a proxy or load balancer like [Cloudflare](https://www.cloudflare.com/learning/ssl/what-is-ssl/) or [nginx](https://nginx.org/en/docs/http/configuring_https_servers.html), which terminates TLS and forwards plain HTTP to the origin. The app then sees `http`, even though the client connected over `https`, so a redirect built from the local scheme would bounce a request that was already secure.

That is how the redirect loop happens. The proxy speaks HTTPS to the client, the origin sees HTTP and redirects to HTTPS, the proxy forwards HTTP again, and the loop never ends. The safe place to enforce HTTPS is the layer that owns the certificate, in line with [build on the platform](/core-concepts/philosophy#build-on-the-platform).

## Where HTTPS Belongs

The redirect itself is one line of proxy config, not application code:

- **At the proxy** - [Cloudflare](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/always-use-https/) and [nginx](https://nginx.org/en/docs/http/configuring_https_servers.html) redirect `http` to `https` before traffic reaches the origin, so the app only ever serves the secure request.
- **In the browser** - the `Strict-Transport-Security` header tells a browser to use HTTPS on its own for future visits, which removes the redirect after the first secure response.

Deserve already covers the second half. The [security headers middleware](/middleware/security-headers#stricttransportsecurity) sets HSTS through the `strictTransportSecurity` option, off by default and meant to turn on once the server is reached over HTTPS.

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Tell browsers to stick to HTTPS
router.use(
  Mware.securityHeaders({
    strictTransportSecurity: 'max-age=31536000; includeSubDomains'
  })
)

await router.serve(8000)
```

## Reading the Real Scheme

When the app does need to know whether the client used HTTPS, the answer rides in a forwarded header the proxy sets, not in the local connection. A trusted proxy adds [`X-Forwarded-Proto`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-Proto), read through [`ctx.get.header`](/core-concepts/context-object#ctx-get-header-key).

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Scheme the client actually used
  const proto = ctx.get.header('x-forwarded-proto') ?? 'http'
  return ctx.send.json({
    secure: proto === 'https'
  })
}
```

Trust this header only behind a proxy configured through [`trustProxy`](/getting-started/server-configuration#client-ip-resolution), the same trust boundary [`ctx.get.ip()`](/core-concepts/context-object#ctx-get-ip-options) relies on. An untrusted client can set any header, so the value means nothing without that boundary.

## Serving HTTPS Directly

A server with no proxy in front can terminate TLS itself by passing a certificate and key to [`Deno.serve`](https://docs.deno.com/runtime/fundamentals/http_server/#https-support), the runtime under [server configuration](/getting-started/server-configuration). Even then the redirect from `http` to `https` is a separate listener concern, not a middleware, so the application stays focused on the request it receives.
