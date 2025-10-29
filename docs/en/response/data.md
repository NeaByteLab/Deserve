# Data Download Responses

The `ctx.send.data()` method downloads in-memory content as files.

## Basic Usage

```typescript
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  const csvData = 'name,age\nAlice,30\nBob,25'
  return ctx.send.data(csvData, 'users.csv')
}
```

## Binary Data

```typescript
export function GET(ctx: Context): Response {
  const binaryData = new Uint8Array([0x89, 0x50, 0x4E, 0x47])
  return ctx.send.data(binaryData, 'image.png')
}
```

## With Custom Content Type

```typescript
export function GET(ctx: Context): Response {
  const jsonData = JSON.stringify({ data: 'value' })
  return ctx.send.data(jsonData, 'data.json', {
    status: 200
  }, 'application/json')
}
```

## Dynamic File Generation

```typescript
export function GET(ctx: Context): Response {
  const data = {
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  }
  const content = JSON.stringify(data, null, 2)
  return ctx.send.data(content, 'metadata.json')
}
```
