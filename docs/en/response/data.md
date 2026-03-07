# Data Download Responses

The `ctx.send.data()` method sends in-memory data (string or `Uint8Array`) as a file download. Useful when content is created at runtime (generate CSV, JSON export, etc.) without writing to disk first.

## Basic Usage

```typescript
// 1. Import Context type
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  // 2. In-memory data (string) + filename for download
  const csvData = 'name,age\nAlice,30\nBob,25'
  return ctx.send.data(csvData, 'users.csv')
}
```

## Binary Data

```typescript
export function GET(ctx: Context): Response {
  // 1. Binary (Uint8Array) + filename
  const binaryData = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
  return ctx.send.data(binaryData, 'image.png')
}
```

## With Custom Content Type

```typescript
export function GET(ctx: Context): Response {
  // 1. String content + filename + options + content-type (4th param)
  const jsonData = JSON.stringify({ data: 'value' })
  return ctx.send.data(
    jsonData,
    'data.json',
    { status: 200 },
    'application/json'
  )
}
```

## Dynamic File Generation

```typescript
export function GET(ctx: Context): Response {
  // 1. Generate dynamic data
  const data = {
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  }
  const content = JSON.stringify(data, null, 2)
  // 2. Send as file download (without writing to disk)
  return ctx.send.data(content, 'metadata.json')
}
```
