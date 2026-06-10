---
description: "Sajikan unduhan file dari filesystem dengan ctx.send.file()."
---

# Response Unduhan File

Method `ctx.send.file()` mengirim isi file dari filesystem sebagai response. Cocok untuk unduhan atau menyajikan file yang sudah ada di disk (path relatif atau absolut).

## Penggunaan Dasar

```typescript twoslash
import type { Context } from '@neabyte/deserve'

export async function GET(ctx: Context): Promise<Response> {
  // Stream file sebagai unduhan
  return await ctx.send.file('./uploads/document.pdf')
}
```

## Dengan Nama File Kustom

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export async function GET(ctx: Context): Promise<Response> {
  // Argumen kedua mengganti nama unduhan
  return await ctx.send.file('./files/data.csv', 'report.csv')
}
```

## Penanganan Error

File yang hilang atau tidak terbaca melempar `Deno.errors.NotFound`. Tangkap di handler untuk balasan presisi, atau biarkan naik ke [error handler terpusat](/id/error-handling/object-details):

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export async function GET(ctx: Context): Promise<Response> {
  try {
    return await ctx.send.file('./uploads/document.pdf')
  } catch (error) {
    // File hilang melempar, balas 404
    return ctx.send.json(
      {
        error: 'File not found'
      },
      {
        status: 404
      }
    )
  }
}
```
