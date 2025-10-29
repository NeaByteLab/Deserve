# File Download Responses

The `ctx.send.file()` method downloads files from the filesystem.

## Basic Usage

```typescript
import type { Context } from '@neabyte/deserve'

export async function GET(ctx: Context): Promise<Response> {
  return await ctx.send.file('./uploads/document.pdf')
}
```

## With Custom Filename

```typescript
export async function GET(ctx: Context): Promise<Response> {
  return await ctx.send.file('./files/data.csv', 'report.csv')
}
```

## Error Handling

```typescript
export async function GET(ctx: Context): Promise<Response> {
  try {
    return await ctx.send.file('./uploads/document.pdf')
  } catch (error) {
    return ctx.send.json({ error: 'File not found' }, { status: 404 })
  }
}
```
