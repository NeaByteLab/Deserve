# Redirect Responses

The `ctx.send.redirect()` method creates a redirect response to another URL. Default status is 302 (temporary redirect); you can use 301 (permanent) or 303 (see other) as needed.

## Basic Usage

```typescript
// 1. Import Context type
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  // 2. Redirect to URL (default status 302)
  return ctx.send.redirect('https://example.com')
}
```

## With Custom Status Code

```typescript
// 1. Permanent redirect (301)
export function GET(ctx: Context): Response {
  return ctx.send.redirect('https://example.com', 301)
}

// 2. Temporary redirect (302) — default
export function GET(ctx: Context): Response {
  return ctx.send.redirect('https://example.com', 302)
}

// 3. "See Other" (303)
export function GET(ctx: Context): Response {
  return ctx.send.redirect('https://example.com', 303)
}
```
