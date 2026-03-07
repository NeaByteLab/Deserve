# Text Responses

The `ctx.send.text()` method creates plain text responses.

## Basic Usage

```typescript
// 1. Import Context type
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  // 2. Send plain text (Content-Type: text/plain)
  return ctx.send.text('Hello World')
}
```

## With Status Codes

```typescript
export function POST(ctx: Context): Response {
  // 1. Send text with status 501 (Not Implemented)
  return ctx.send.text('Not Implemented', { status: 501 })
}
```

## Error Messages

```typescript
export function GET(ctx: Context): Response {
  // 1. Plain text error message + status 500
  return ctx.send.text('Internal Server Error', { status: 500 })
}
```

## Custom Headers

```typescript
export function GET(ctx: Context): Response {
  // 1. Send text + custom headers via options
  return ctx.send.text('Hello World', {
    headers: {
      'Content-Language': 'en',
      'X-Custom': 'value'
    }
  })
}
```
