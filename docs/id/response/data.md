---
description: "Kirim unduhan data biner dengan ctx.send.data()."
---

# Response Unduhan Data

Method `ctx.send.data()` mengirim data in-memory (string atau `Uint8Array`) sebagai unduhan file. Berguna saat konten dibuat saat runtime (generate CSV, ekspor JSON, dll.) tanpa menulis ke disk dulu.

## Penggunaan Dasar

```typescript twoslash
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  // Body string dengan nama unduhan
  const csvData = 'name,age\nAlice,30\nBob,25'
  return ctx.send.data(csvData, 'users.csv')
}
```

## Data Biner

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Body Uint8Array dengan nama unduhan
  const binaryData = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
  return ctx.send.data(binaryData, 'image.png')
}
```

## Dengan Content Type Kustom

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Argumen keempat mengatur content type
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

## Pembuatan File Dinamis

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Bangun payload saat runtime
  const data = {
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  }
  const content = JSON.stringify(data, null, 2)
  // Unduh tanpa menyentuh disk
  return ctx.send.data(content, 'metadata.json')
}
```
