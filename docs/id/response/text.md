# Response Teks

Method `ctx.send.text()` membuat response teks biasa.

## Penggunaan Dasar

```typescript
// 1. Import tipe Context
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  // 2. Kirim plain text (Content-Type: text/plain)
  return ctx.send.text('Hello World')
}
```

## Dengan Status Code Kustom

```typescript
export function POST(ctx: Context): Response {
  // 1. Kirim teks dengan status 501 (Not Implemented)
  return ctx.send.text('Not Implemented', { status: 501 })
}
```

## Pesan Error

```typescript
export function GET(ctx: Context): Response {
  // 1. Pesan error plain text + status 500
  return ctx.send.text('Internal Server Error', { status: 500 })
}
```

## Header Kustom

```typescript
export function GET(ctx: Context): Response {
  // 1. Kirim teks + custom headers lewat options
  return ctx.send.text('Hello World', {
    headers: {
      'Content-Language': 'en',
      'X-Custom': 'value'
    }
  })
}
```
