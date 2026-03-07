# File Download Responses

The `ctx.send.file()` method sends file contents from the filesystem as the response. Suitable for downloads or serving files already on disk (relative or absolute path).

## Basic Usage

```typescript
// 1. Import Context type
import type { Context } from '@neabyte/deserve'

export async function GET(ctx: Context): Promise<Response> {
  // 2. Read file from path, send as attachment (async)
  return await ctx.send.file('./uploads/document.pdf')
}
```

## With Custom Filename

```typescript
export async function GET(ctx: Context): Promise<Response> {
  // 1. Second param: filename for user download (can differ from path)
  return await ctx.send.file('./files/data.csv', 'report.csv')
}
```

## Error Handling

```typescript
export async function GET(ctx: Context): Promise<Response> {
  try {
    // 1. Try read and send file
    return await ctx.send.file('./uploads/document.pdf')
  } catch (error) {
    // 2. If failed (e.g. file not found), send 404 JSON
    return ctx.send.json({ error: 'File not found' }, { status: 404 })
  }
}
```
