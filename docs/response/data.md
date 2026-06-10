---
description: "Send binary data downloads with ctx.send.data()."
---

# Data Download Responses

The `ctx.send.data()` method sends in-memory data (string or `Uint8Array`) as a file download. Useful when content is created at runtime (generate CSV, JSON export, etc.) without writing to disk first.

## Basic Usage

```typescript twoslash
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  // String body with a download name
  const csvData = 'name,age\nAlice,30\nBob,25'
  return ctx.send.data(csvData, 'users.csv')
}
```

## Binary Data

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Uint8Array body with a download name
  const binaryData = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
  return ctx.send.data(binaryData, 'image.png')
}
```

## With Custom Content Type

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Fourth arg sets the content type
  const jsonData = JSON.stringify({
    data: 'value'
  })
  return ctx.send.data(
    jsonData,
    'data.json',
    { status: 200 },
    'application/json'
  )
}
```

## Dynamic File Generation

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Build the payload at runtime
  const data = {
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  }
  const content = JSON.stringify(data, null, 2)
  // Download without touching disk
  return ctx.send.data(content, 'metadata.json')
}
```
