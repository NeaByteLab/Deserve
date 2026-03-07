# Response Redirect

Method `ctx.send.redirect()` membuat response redirect ke URL lain. Status default 302 (temporary redirect); Anda bisa memakai 301 (permanent) atau 303 (see other) sesuai kebutuhan.

Status code default adalah 302 (temporary redirect).

## Penggunaan Dasar

```typescript
// 1. Import tipe Context
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  // 2. Redirect ke URL (default status 302)
  return ctx.send.redirect('https://example.com')
}
```

## Dengan Status Code Kustom

```typescript
// 1. Redirect permanen (301)
export function GET(ctx: Context): Response {
  return ctx.send.redirect('https://example.com', 301)
}

// 2. Redirect sementara (302) — default
export function GET(ctx: Context): Response {
  return ctx.send.redirect('https://example.com', 302)
}

// 3. "See Other" (303)
export function GET(ctx: Context): Response {
  return ctx.send.redirect('https://example.com', 303)
}
```
