# Response Redirect

Method `ctx.send.redirect()` membuat response redirect.

Status code default adalah 302 (temporary redirect).

## Penggunaan Dasar

```typescript
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  return ctx.send.redirect('https://example.com')
}
```

## Dengan Custom Status Code

```typescript
export function GET(ctx: Context): Response {
  // Permanent redirect (301)
  return ctx.send.redirect('https://example.com', 301)
}

export function GET(ctx: Context): Response {
  // Temporary redirect (302) - default
  return ctx.send.redirect('https://example.com', 302)
}

export function GET(ctx: Context): Response {
  // "See Other" redirect (303)
  return ctx.send.redirect('https://example.com', 303)
}
```

