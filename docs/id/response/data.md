# Response Unduhan Data

Method `ctx.send.data()` mengirim data in-memory (string atau `Uint8Array`) sebagai file download. Berguna ketika konten dibuat di runtime (generate CSV, JSON export, dll.) tanpa menulis ke disk dulu.

## Penggunaan Dasar

```typescript
// 1. Import tipe Context
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  // 2. Data in-memory (string) + nama file untuk download
  const csvData = 'name,age\nAlice,30\nBob,25'
  return ctx.send.data(csvData, 'users.csv')
}
```

## Data Biner

```typescript
export function GET(ctx: Context): Response {
  // 1. Binary (Uint8Array) + nama file
  const binaryData = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
  return ctx.send.data(binaryData, 'image.png')
}
```

## Dengan Content-Type Kustom

```typescript
export function GET(ctx: Context): Response {
  // 1. String content + filename + options + content-type (param ke-4)
  const jsonData = JSON.stringify({ data: 'value' })
  return ctx.send.data(
    jsonData,
    'data.json',
    {
      status: 200
    },
    'application/json'
  )
}
```

## Pembuatan File Dinamis

```typescript
export function GET(ctx: Context): Response {
  // 1. Generate data dinamis
  const data = {
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  }
  const content = JSON.stringify(data, null, 2)
  // 2. Kirim sebagai file download (tanpa nulis ke disk)
  return ctx.send.data(content, 'metadata.json')
}
```
