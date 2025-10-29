# Custom Responses

The `ctx.send.custom()` method creates custom responses with full control over body, status code, headers, and all response configuration options.

## Basic Usage

```typescript
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  return ctx.send.custom('Custom response body')
}
```

## With Status Code

```typescript
export function GET(ctx: Context): Response {
  return ctx.send.custom('Not Found', { status: 404 })
}
```

## With Custom Headers

```typescript
export function GET(ctx: Context): Response {
  ctx.setHeader('X-Custom', 'value')
  return ctx.send.custom('Response body', {
    headers: {
      'Content-Type': 'application/xml',
      'X-Additional': 'header'
    }
  })
}
```

## Binary Responses

```typescript
export function GET(ctx: Context): Response {
  const binaryData = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F])
  return ctx.send.custom(binaryData, {
    headers: {
      'Content-Type': 'application/octet-stream'
    }
  })
}
```

## Empty Response

```typescript
export function GET(ctx: Context): Response {
  return ctx.send.custom(null, { status: 204 })
}
```

## XML Response

```typescript
export function GET(ctx: Context): Response {
  const xml = '<?xml version="1.0"?><data><message>Hello</message></data>'
  return ctx.send.custom(xml, {
    headers: {
      'Content-Type': 'application/xml'
    }
  })
}
```

## Combining Context Headers and Custom Options

Headers set via `ctx.setHeader()` are merged with headers from the options parameter:

```typescript
export function GET(ctx: Context): Response {
  ctx.setHeader('X-Context-Header', 'from-context')
  return ctx.send.custom('Body', {
    headers: {
      'X-Options-Header': 'from-options'
    }
  })
  // Both headers will be included in the response
}
```

Options headers take precedence over context headers if there's a conflict.
