# Custom Responses

The `ctx.send.custom()` method creates custom responses with full control over body, status code, headers, and all response configuration options.

## Basic Usage

```typescript
// 1. Import Context type
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  // 2. Free-form body (string); status/headers via options
  return ctx.send.custom('Custom response body')
}
```

## With Status Code

```typescript
export function GET(ctx: Context): Response {
  // 1. Body + status 404
  return ctx.send.custom('Not Found', { status: 404 })
}
```

## With Custom Headers

```typescript
export function GET(ctx: Context): Response {
  // 1. Header from context
  ctx.setHeader('X-Custom', 'value')
  // 2. Body + headers from options (Content-Type, etc.)
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
  // 1. Binary body (Uint8Array) + Content-Type
  const binaryData = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f])
  return ctx.send.custom(binaryData, {
    headers: { 'Content-Type': 'application/octet-stream' }
  })
}
```

## Empty Response (No Content)

```typescript
export function GET(ctx: Context): Response {
  // 1. No content (204) — body null
  return ctx.send.custom(null, { status: 204 })
}
```

## XML Response

```typescript
export function GET(ctx: Context): Response {
  // 1. XML string + Content-Type application/xml
  const xml = '<?xml version="1.0"?><data><message>Hello</message></data>'
  return ctx.send.custom(xml, {
    headers: { 'Content-Type': 'application/xml' }
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
