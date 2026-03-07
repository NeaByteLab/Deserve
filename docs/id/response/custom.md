# Respon Khusus

Method `ctx.send.custom()` membuat response custom dengan kontrol penuh atas body, status code, headers, dan semua opsi konfigurasi response.

## Penggunaan Dasar

```typescript
// 1. Import tipe Context
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  // 2. Body bebas (string); status/headers lewat options
  return ctx.send.custom('Custom response body')
}
```

## Dengan Status Code Kustom

```typescript
export function GET(ctx: Context): Response {
  // 1. Body + status 404
  return ctx.send.custom('Not Found', { status: 404 })
}
```

## Dengan Header Kustom

```typescript
export function GET(ctx: Context): Response {
  // 1. Header dari context
  ctx.setHeader('X-Custom', 'value')
  // 2. Body + headers dari options (Content-Type, dll.)
  return ctx.send.custom('Response body', {
    headers: {
      'Content-Type': 'application/xml',
      'X-Additional': 'header'
    }
  })
}
```

## Response Biner

```typescript
export function GET(ctx: Context): Response {
  // 1. Body binary (Uint8Array) + Content-Type
  const binaryData = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f])
  return ctx.send.custom(binaryData, {
    headers: { 'Content-Type': 'application/octet-stream' }
  })
}
```

## Response Kosong (No Content)

```typescript
export function GET(ctx: Context): Response {
  // 1. No content (204) — body null
  return ctx.send.custom(null, { status: 204 })
}
```

## Response XML

```typescript
export function GET(ctx: Context): Response {
  // 1. String XML + Content-Type application/xml
  const xml = '<?xml version="1.0"?><data><message>Hello</message></data>'
  return ctx.send.custom(xml, {
    headers: { 'Content-Type': 'application/xml' }
  })
}
```

## Menggabungkan Header Context Dan Opsi Kustom

Headers yang diatur via `ctx.setHeader()` akan digabung dengan headers dari parameter options:

```typescript
export function GET(ctx: Context): Response {
  // 1. Header dari context
  ctx.setHeader('X-Context-Header', 'from-context')
  // 2. Header dari options — digabung; options menang jika konflik
  return ctx.send.custom('Body', {
    headers: { 'X-Options-Header': 'from-options' }
  })
}
```

Headers dari options akan mengambil prioritas di atas context headers jika ada konflik.
