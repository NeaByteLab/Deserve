# Respon Khusus

Method `ctx.send.custom()` membuat response custom dengan kontrol penuh atas body, status code, headers, dan semua opsi konfigurasi response.

## Penggunaan Dasar

```typescript
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  return ctx.send.custom('Custom response body')
}
```

## Dengan Status Code

```typescript
export function GET(ctx: Context): Response {
  return ctx.send.custom('Not Found', { status: 404 })
}
```

## Dengan Custom Headers

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

## Binary Response

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

## Menggabungkan Context Headers dan Custom Options

Headers yang diatur via `ctx.setHeader()` akan digabung dengan headers dari parameter options:

```typescript
export function GET(ctx: Context): Response {
  ctx.setHeader('X-Context-Header', 'from-context')
  return ctx.send.custom('Body', {
    headers: {
      'X-Options-Header': 'from-options'
    }
  })
  // Kedua headers akan disertakan dalam response
}
```

Headers dari options akan mengambil prioritas di atas context headers jika ada konflik.
