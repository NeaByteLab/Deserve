---
description: 'Serve files from S3, R2, or any object storage in Deserve through the staticHandler hook or a route handler.'
---

# Object Storage

Built-in [static serving](/static-file/basic) reads from the local filesystem, so `router.static()` alone cannot reach a bucket on S3, Cloudflare R2, or Google Cloud Storage. The bridge is the [`staticHandler`](/getting-started/routes-configuration#statichandler) option, a hook that keeps the familiar static route while swapping the file read for a fetch against object storage. A route still registers with `router.static()`, and the handler answers each request from the bucket instead of the disk.

## Why a Hook Instead of a Path

The `path` option on [static serving](/static-file/basic#path) maps a URL prefix to a folder that `Deno.stat` and `Deno.realPath` can resolve, which is a local-disk contract. Object storage has no real path on disk, so the safe traversal checks and the file handle streaming never apply. The `staticHandler` hook hands the whole serve step over, so the bucket becomes the source of truth while the route surface stays the same.

## Serving From a Bucket

Most object stores expose an HTTPS endpoint per object, so a `fetch` against `${endpoint}/${key}` pulls the bytes. The handler slices the URL prefix off `ctx.pathname` to recover the object key, then streams the response body straight through with [`ctx.send.stream`](/response/stream):

```typescript twoslash
import { Router, type Context, type ServeOptions } from '@neabyte/deserve'

// Bucket base endpoint
const endpoint = 'https://my-bucket.s3.amazonaws.com'

const router = new Router({
  routesDir: 'routes',
  staticHandler: {
    // Serve each object from the bucket
    async serve(ctx: Context, options: ServeOptions, urlPath: string) {
      // Recover object key from the path
      const key = ctx.pathname.slice(urlPath.length).replace(/^\//, '')
      const object = await fetch(`${endpoint}/${key}`)
      if (!object.ok || !object.body) {
        return ctx.handleError(404, new Deno.errors.NotFound('Object not found'))
      }
      // Stream bucket body to the client
      const contentType = object.headers.get('content-type') ?? 'application/octet-stream'
      return ctx.send.stream(object.body, undefined, contentType)
    }
  }
})

// Register the route the handler fulfills
router.static(
  '/assets',
  {
    path: 's3'
  }
)

await router.serve(8000)
```

The `path` value still has to be set on [`router.static()`](/static-file/basic) since it is required, yet the handler ignores it here because the bucket replaces the local folder. A request to `/assets/logo.png` becomes a fetch for the `logo.png` key.

## Forwarding a Byte Range

Static serving answers a [byte range](/static-file/basic#byte-range-requests) on its own, but a custom handler owns that job now. Passing the incoming `Range` header through to the bucket lets the store return the partial content, and forwarding the status and range headers back keeps a video scrubber or resumable download working:

```typescript twoslash
import type { Context, ServeOptions } from '@neabyte/deserve'
declare const endpoint: string
// ---cut---
async function serve(ctx: Context, options: ServeOptions, urlPath: string) {
  const key = ctx.pathname.slice(urlPath.length).replace(/^\//, '')
  const range = ctx.header('range')

  // Forward the Range header when present
  const object = await fetch(`${endpoint}/${key}`, {
    headers: range ? { Range: range } : {}
  })
  if (!object.ok || !object.body) {
    return ctx.handleError(404, new Deno.errors.NotFound('Object not found'))
  }

  // Mirror range headers back to the client
  const contentType = object.headers.get('content-type') ?? 'application/octet-stream'
  const contentRange = object.headers.get('content-range')
  if (contentRange) {
    ctx.setHeader('Content-Range', contentRange)
    ctx.setHeader('Accept-Ranges', 'bytes')
  }
  return ctx.send.custom(object.body, {
    status: object.status,
    headers: {
      'Content-Type': contentType
    }
  })
}
```

A `206 Partial Content` from the bucket flows back unchanged, since `ctx.send.custom` keeps the status the bucket chose.

## Using a Route Handler Instead

The `staticHandler` hook covers a whole URL prefix, which fits a public asset folder. A single download behind auth or business logic fits a normal [route handler](/core-concepts/file-based-routing) better, where middleware runs first and the key comes from a [route param](/core-concepts/route-patterns):

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const endpoint: string
// ---cut---
// routes/files/[key].ts
export async function GET(ctx: Context): Promise<Response> {
  const key = ctx.param('key')
  const object = await fetch(`${endpoint}/${key}`)
  if (!object.ok || !object.body) {
    return ctx.handleError(404, new Deno.errors.NotFound('Object not found'))
  }
  // Stream the object straight through
  const contentType = object.headers.get('content-type') ?? 'application/octet-stream'
  return ctx.send.stream(object.body, undefined, contentType)
}
```

This path runs the full middleware chain, so guarding it with [basic auth](/middleware/basic-auth) or a [session](/middleware/session) check happens before the bucket is ever touched.

## Signing Requests

A private bucket needs signed requests rather than a plain `fetch`. Two routes work well:

- **Presigned URL** - the SDK signs a short-lived URL, and the handler either redirects with [`ctx.redirect`](/response/redirect) or fetches it server-side.
- **Server-side SDK** - the official client signs each request, for example the [AWS SDK for JavaScript](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/welcome.html) for S3 or the Cloudflare R2 binding for [Workers](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/).

Whichever route signs the request, the response body still streams through `ctx.send.stream`, so the serving shape stays the same.

## Handling Failures

Object storage adds network calls that can time out or reject, so every fetch passes its failure to the [centralized error handler](/error-handling/object-details) instead of leaking a raw error. A missing object maps to **404**, while an upstream outage maps to **502** so the cause stays readable:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const endpoint: string
// ---cut---
export async function GET(ctx: Context): Promise<Response> {
  const key = ctx.param('key')
  try {
    const object = await fetch(`${endpoint}/${key}`)
    if (object.status === 404) {
      return await ctx.handleError(404, new Deno.errors.NotFound('Object not found'))
    }
    // Map an upstream failure to 502
    if (!object.ok || !object.body) {
      return await ctx.handleError(502, new Error('Object storage unavailable'))
    }
    return ctx.send.stream(object.body, undefined, 'application/octet-stream')
  } catch (error) {
    // Route any network fault through error handling
    return await ctx.handleError(502, error as Error)
  }
}
```

Shaping these into a single client response lives in [Error Handling](/error-handling/object-details), and capturing them for logs lives in [Error Reporting](/middleware/observability/errors).
