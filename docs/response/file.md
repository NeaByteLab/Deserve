---
description: "Serve file downloads from the filesystem with ctx.send.file()."
---

# File Download Responses

The `ctx.send.file()` method sends file contents from the filesystem as the response. Suitable for downloads or serving files already on disk (relative or absolute path).

## Basic Usage

```typescript twoslash
import type { Context } from '@neabyte/deserve'

export async function GET(ctx: Context): Promise<Response> {
  // Stream the file as a download
  return await ctx.send.file('./uploads/document.pdf')
}
```

## With Custom Filename

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export async function GET(ctx: Context): Promise<Response> {
  // Second arg renames the download
  return await ctx.send.file('./files/data.csv', 'report.csv')
}
```

## Error Handling

A missing or unreadable file throws `Deno.errors.NotFound`. Catch it in the handler for a precise reply, or let it bubble to the [centralized error handler](/error-handling/object-details):

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export async function GET(ctx: Context): Promise<Response> {
  try {
    return await ctx.send.file('./uploads/document.pdf')
  } catch (error) {
    // Missing file throws, reply 404
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
