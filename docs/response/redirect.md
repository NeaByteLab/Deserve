---
description: "Create redirect responses with ctx.send.redirect(), including allowed status codes and safety rules."
---

# Redirect Responses

The `ctx.send.redirect()` method creates a redirect response to another URL. The default status is 302 (temporary redirect) and the accepted statuses are 301 (permanent), 302, 303 (see other), 307 (temporary) and 308 (permanent), so any other status throws `Deno.errors.InvalidData`.

## Basic Usage

```typescript twoslash
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  // Defaults to a 302 redirect
  return ctx.send.redirect('https://example.com')
}
```

## With Custom Status Code

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
// Permanent redirect (301)
export function permanent(ctx: Context): Response {
  return ctx.send.redirect('https://example.com', 301)
}

// Temporary redirect (302), the default
export function temporary(ctx: Context): Response {
  return ctx.send.redirect('https://example.com', 302)
}

// See Other (303)
export function seeOther(ctx: Context): Response {
  return ctx.send.redirect('https://example.com', 303)
}

// Temporary, keep method (307)
export function keepTemporary(ctx: Context): Response {
  return ctx.send.redirect('https://example.com', 307)
}

// Permanent, keep method (308)
export function keepPermanent(ctx: Context): Response {
  return ctx.send.redirect('https://example.com', 308)
}
```

## With Custom Headers

The third argument carries extra response headers:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Redirect 302 with one extra header
  return ctx.send.redirect('/dashboard', 302, {
    headers: { 'X-Redirect-Reason': 'login' }
  })
}
```

## URL Resolution

A relative target resolves against the current request URL and must stay on the same origin, which guards against open redirects. To send a visitor to another site, pass a full `https://` URL on purpose:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Same-origin relative path, resolved safely
  return ctx.send.redirect('/login')
}
```

The target must use the `http` or `https` scheme. A relative path that resolves to a different origin, a non-http scheme, or an unparseable URL throws `Deno.errors.InvalidData`. Any `Location` passed through the headers is ignored, since the resolved URL always wins.

## Method Signature

```typescript
ctx.send.redirect(
  url: string,
  status?: 301 | 302 | 303 | 307 | 308,
  options?: { headers?: HeadersInit }
): Response
```

- **url** - target location for the redirect
- **status** - redirect status, defaults to `302`
- **options** - optional response headers
