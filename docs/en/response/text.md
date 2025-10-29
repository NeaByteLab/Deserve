# Text Responses

The `ctx.send.text()` method creates plain text responses.

## Basic Usage

```typescript
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  return ctx.send.text('Hello World')
}
```

## With Status Codes

```typescript
export function POST(ctx: Context): Response {
  return ctx.send.text('Not Implemented', { status: 501 })
}
```

## Error Messages

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
