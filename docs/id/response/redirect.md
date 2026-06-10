---
description: "Buat response redirect dengan ctx.send.redirect(), termasuk status code yang diizinkan dan aturan keamanan."
---

# Response Redirect

Method `ctx.send.redirect()` membuat response redirect ke URL lain. Status default 302 (temporary redirect) dan status yang diterima adalah 301 (permanent), 302, 303 (see other), 307 (temporary), dan 308 (permanent), jadi status lain melempar `Deno.errors.InvalidData`.

## Penggunaan Dasar

```typescript twoslash
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  // Default redirect 302
  return ctx.send.redirect('https://example.com')
}
```

## Dengan Status Code Kustom

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
// Redirect permanen (301)
export function permanent(ctx: Context): Response {
  return ctx.send.redirect('https://example.com', 301)
}

// Redirect sementara (302), default
export function temporary(ctx: Context): Response {
  return ctx.send.redirect('https://example.com', 302)
}

// See Other (303)
export function seeOther(ctx: Context): Response {
  return ctx.send.redirect('https://example.com', 303)
}

// Sementara, pertahankan metode (307)
export function keepTemporary(ctx: Context): Response {
  return ctx.send.redirect('https://example.com', 307)
}

// Permanen, pertahankan metode (308)
export function keepPermanent(ctx: Context): Response {
  return ctx.send.redirect('https://example.com', 308)
}
```

## Dengan Header Kustom

Argumen ketiga membawa header response tambahan:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Redirect 302 dengan satu header tambahan
  return ctx.send.redirect('/dashboard', 302, {
    headers: {
      'X-Redirect-Reason': 'login'
    }
  })
}
```

## Resolusi URL

Target relatif diselesaikan terhadap URL request saat ini dan harus tetap di origin yang sama, sehingga mencegah open redirect. Untuk mengarahkan pengunjung ke situs lain, kirim URL `https://` lengkap secara sengaja:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Path relatif same-origin, diselesaikan aman
  return ctx.send.redirect('/login')
}
```

Target harus memakai skema `http` atau `https`. Path relatif yang menyelesaikan ke origin berbeda, skema non-http, atau URL yang tidak bisa diuraikan melempar `Deno.errors.InvalidData`. `Location` apa pun yang dikirim lewat header diabaikan, karena URL hasil resolusi selalu menang.

## Method Signature

```typescript
ctx.send.redirect(
  url: string,
  status?: 301 | 302 | 303 | 307 | 308,
  options?: { headers?: HeadersInit }
): Response
```

- **url** - lokasi target untuk redirect
- **status** - status redirect, default `302`
- **options** - header response opsional
