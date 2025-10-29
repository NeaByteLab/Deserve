# Response Unduhan File

Method `ctx.send.file()` mengunduh file dari filesystem.

## Penggunaan Dasar

```typescript
import type { Context } from '@neabyte/deserve'

export async function GET(ctx: Context): Promise<Response> {
  return await ctx.send.file('./uploads/document.pdf')
}
```

## Dengan Custom Filename

```typescript
export async function GET(ctx: Context): Promise<Response> {
  return await ctx.send.file('./files/data.csv', 'report.csv')
}
```

## Penanganan Error

```typescript
export async function GET(ctx: Context): Promise<Response> {
  try {
    return await ctx.send.file('./uploads/document.pdf')
  } catch (error) {
    return ctx.send.json({ error: 'File not found' }, { status: 404 })
  }
}
```

