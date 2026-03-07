# Response Unduhan File

Method `ctx.send.file()` mengirim isi file dari filesystem sebagai response. Cocok untuk download atau menyajikan file yang sudah ada di disk (path relatif atau absolut).

## Penggunaan Dasar

```typescript
// 1. Import tipe Context
import type { Context } from '@neabyte/deserve'

export async function GET(ctx: Context): Promise<Response> {
  // 2. Baca file dari path, kirim sebagai attachment (async)
  return await ctx.send.file('./uploads/document.pdf')
}
```

## Dengan Nama File Kustom

```typescript
export async function GET(ctx: Context): Promise<Response> {
  // 1. Param kedua: nama file yang didownload user (bisa beda dari path)
  return await ctx.send.file('./files/data.csv', 'report.csv')
}
```

## Penanganan Error

```typescript
export async function GET(ctx: Context): Promise<Response> {
  try {
    // 1. Coba baca dan kirim file
    return await ctx.send.file('./uploads/document.pdf')
  } catch (error) {
    // 2. Jika gagal (e.g. file tidak ada), kirim 404 JSON
    return ctx.send.json({ error: 'File not found' }, { status: 404 })
  }
}
```
