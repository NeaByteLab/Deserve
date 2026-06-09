---
description: "Build fully custom responses with ctx.send.custom() when the helpers are not enough."
---

# Custom Responses

The `ctx.send.custom()` method creates custom responses with full control over body, status code, headers, and all response configuration options. Unlike the typed helpers, it sets no `Content-Type` on its own, so add one through the headers when the body needs it.

## Basic Usage

```typescript twoslash
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  // Status and headers stay optional
  return ctx.send.custom('Custom response body')
}
```

## With Status Code

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Set the response status to 404
  return ctx.send.custom('Not Found', { status: 404 })
}
```

## With Custom Headers

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Header set on the context
  ctx.setHeader('X-Custom', 'value')
  // Options can add more headers
  return ctx.send.custom('Response body', {
    headers: {
      'Content-Type': 'application/xml',
      'X-Additional': 'header'
    }
  })
}
```

## Binary Responses

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Send raw bytes with a type
  const binaryData = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f])
  return ctx.send.custom(binaryData, {
    headers: { 'Content-Type': 'application/octet-stream' }
  })
}
```

## Empty Response (No Content)

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // 204 sends a null body
  return ctx.send.custom(null, { status: 204 })
}
```

## XML Response

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // XML string with an XML type
  const xml = '<?xml version="1.0"?><data><message>Hello</message></data>'
  return ctx.send.custom(xml, {
    headers: { 'Content-Type': 'application/xml' }
  })
}
```

## Combining Context Headers and Custom Options

Headers set via `ctx.setHeader()` are merged with headers from the options parameter:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  ctx.setHeader('X-Context-Header', 'from-context')
  return ctx.send.custom('Body', {
    headers: {
      'X-Options-Header': 'from-options'
    }
  })
  // Response carries both headers
}
```

Options headers take precedence over context headers when they conflict.
