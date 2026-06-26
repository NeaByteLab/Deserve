---
description: "Why Deserve has no compression middleware, since Deno compresses responses and proxies handle the rest."
---

# Compression

Deserve ships no compression middleware, and that gap is filled twice over before a request ever reaches application code.

## Why It Is Not Built In

Compression belongs to the layers around the handler, not inside it. The runtime does it on the way out, and in production a proxy usually did it first. A middleware that re-runs the same work would only add cost and a chance to clash with the encoding those layers already set.

Two layers already cover it:

- **The runtime** - [`Deno.serve`](/getting-started/server-configuration) compresses response bodies on its own, in line with [build on the platform](/core-concepts/philosophy#build-on-the-platform).
- **The network edge** - most production apps sit behind a proxy like [Cloudflare](https://developers.cloudflare.com/speed/optimization/content/compression/) or [nginx](https://docs.nginx.com/nginx/admin-guide/web-server/compression/), where compression is the network layer's job, not the application's.

So a compress middleware earns its keep only on a bare localhost with no proxy in front, and even there the runtime has it handled.

## What Deno Does on Its Own

`Deno.serve` reads the request `Accept-Encoding` header and compresses the response body when these hold true:

- The header advertises `br` for Brotli or `gzip`, and the quality value preference is respected.
- The response `Content-Type` is one of the compressible types.
- The response body is larger than 64 bytes.

When it compresses, the runtime sets `Content-Encoding` to the chosen scheme and adjusts the `Vary` header so caches key on the encoding. Nothing in the handler needs to ask for this.

A response is left uncompressed when any of these is present, which is the runtime stepping aside on purpose:

- A `Content-Encoding` header, meaning the body is already encoded.
- A `Content-Range` header, meaning a range request is in play.
- A `Cache-Control: no-transform` header, meaning no layer should rewrite the body.

## Letting the Runtime Compress

The default path is to send a normal response and leave the encoding alone. A plain JSON or text body flows through, and the runtime compresses it when the client supports it.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Send plain, runtime compresses when able
  return ctx.send.json({
    message: 'compressed by the runtime'
  })
}
```

## Opting a Response Out

To keep one response uncompressed, set a header the runtime treats as a stop signal. A `Cache-Control: no-transform` tells both the runtime and any downstream proxy to leave the body untouched.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Block any layer from rewriting body
  ctx.set.header('Cache-Control', 'no-transform')
  return ctx.send.json({
    message: 'sent verbatim'
  })
}
```

Setting headers through [`ctx.set.header`](/core-concepts/context-object#ctx-set-header-key-value) is the same path used everywhere else, so this opt-out reads like any other header.

## Already-Encoded Bodies

A body that arrives pre-compressed, such as a stored `.gz` asset, carries its own `Content-Encoding`. The runtime sees that header and skips re-compression, so the bytes ship as-is. For files on disk this is handled by [static serving](/static-file/basic), which sets the type and lets the runtime decide.

## Behind a Proxy

In a deployment fronted by Cloudflare or nginx, the proxy negotiates compression with the client at the edge, often before the request reaches the origin. The origin can still send a normal response, and the layers agree on the encoding through the `Accept-Encoding` and `Vary` headers. The application stays out of it, which is the whole point.
