# Response Teks

Method `ctx.send.text()` membuat response teks biasa.

## Penggunaan Dasar

```typescript
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  return ctx.send.text('Hello World')
}
```

## Dengan Status Code

```typescript
export function POST(ctx: Context): Response {
  return ctx.send.text('Not Implemented', { status: 501 })
}
```

## Pesan Error

```typescript
export function GET(ctx: Context): Response {
  return ctx.send.text('Internal Server Error', { status: 500 })
}
```

## Custom Headers

```typescript
export function GET(ctx: Context): Response {
  return ctx.send.text('Hello World', {
    headers: {
      'Content-Language': 'en',
      'X-Custom': 'value'
    }
  })
}
```

