---
description: 'Serve files from S3, R2, or any object storage in Deserve through a route handler.'
---

# Object Storage

Built-in [static serving](/static-file/basic) reads from the local filesystem, so `router.static()` with a `path` option alone cannot reach a bucket on S3, Cloudflare R2, or Google Cloud Storage. The bridge is the [custom static handler](/static-file/basic#custom-handler) that `router.static()` already accepts, a function of the shape `(ctx, urlPath) => Response` that swaps the file read for a fetch against object storage. The mount keeps the same URL surface while the bucket becomes the source of truth.

## Why a Custom Handler

The `path` option on [static serving](/static-file/basic#path) maps a URL prefix to a folder that `Deno.stat` and `Deno.realPath` can resolve, which is a local-disk contract. Object storage has no real path on disk, so the safe traversal checks and the file-handle streaming never apply. Passing a function instead of a `ServeOptions` object hands the whole serve step over, so the route surface stays identical while a `fetch` answers each request. The handler still runs only after dynamic routes miss, the same [matching order](/static-file/basic#how-it-works) as the built-in mount.

## Serving From a Bucket

Most object stores expose an HTTPS endpoint per object, so a `fetch` against `${endpoint}/${key}` pulls the bytes. The handler receives `urlPath` with the mount prefix already stripped, so `/assets/logo.png` arrives as `/logo.png`. Strip the leading slash to recover the object key, then stream the response body straight through with [`ctx.send.custom`](/response/custom):

```typescript twoslash
import { Router } from '@neabyte/deserve'

// Bucket base endpoint
const endpoint = 'https://my-bucket.s3.amazonaws.com'

const router = new Router({
  routes: { directory: './routes' }
})

// Custom handler bridges to a bucket
router.static('/assets', async (ctx, urlPath) => {
  // Drop the leading slash for key
  const key = urlPath.replace(/^\//, '')
  const object = await fetch(`${endpoint}/${key}`)
  if (object.status === 404) {
    return await ctx.handleError(404, new Deno.errors.NotFound('Object not found'))
  }
  if (!object.ok || !object.body) {
    return await ctx.handleError(502, new Error('Object storage unavailable'))
  }
  // Stream the bucket body straight through
  const contentType = object.headers.get('content-type') ?? 'application/octet-stream'
  return ctx.send.custom(object.body, {
    headers: {
      'Content-Type': contentType
    }
  })
})

await router.serve(8000)
```

A request to `/assets/logo.png` becomes a fetch for the `logo.png` key, and the bucket's bytes flow back without ever touching the disk.

## Forwarding a Byte Range

Built-in serving answers a [byte range](/static-file/basic#byte-range-requests) on its own, but a custom handler owns that job now. Passing the incoming `Range` header through to the bucket lets the store return the partial content, and forwarding the status and range headers back keeps a video scrubber or resumable download working:

```typescript twoslash
import { Router, type HttpStatusCode } from '@neabyte/deserve'

const endpoint = 'https://my-bucket.s3.amazonaws.com'

const router = new Router({
  routes: { directory: './routes' }
})
// ---cut---
router.static('/assets', async (ctx, urlPath) => {
  const key = urlPath.replace(/^\//, '')
  const range = ctx.get.header('range')

  // Forward the Range header when present
  const object = await fetch(`${endpoint}/${key}`, {
    headers: range ? { Range: range } : {}
  })
  if (!object.ok || !object.body) {
    return await ctx.handleError(404, new Deno.errors.NotFound('Object not found'))
  }

  // Mirror range headers back to the client
  const contentType = object.headers.get('content-type') ?? 'application/octet-stream'
  const contentRange = object.headers.get('content-range')
  if (contentRange) {
    ctx.set.header('Content-Range', contentRange)
    ctx.set.header('Accept-Ranges', 'bytes')
  }
  return ctx.send.custom(object.body, {
    status: object.status as HttpStatusCode,
    headers: {
      'Content-Type': contentType
    }
  })
})
```

A `206 Partial Content` from the bucket flows back unchanged, since passing `object.status` to `ctx.send.custom` keeps the status the bucket chose.

## Using a Route Handler Instead

A route handler fits a single download behind auth or business logic better, where middleware runs first and the key comes from a [route param](/core-concepts/route-patterns):

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const endpoint: string
// ---cut---
// routes/files/[key].ts
export async function GET(ctx: Context): Promise<Response> {
  const key = ctx.get.param('key')
  const object = await fetch(`${endpoint}/${key}`)
  if (!object.ok || !object.body) {
    return await ctx.handleError(404, new Deno.errors.NotFound('Object not found'))
  }
  // Stream the object straight through
  const contentType = object.headers.get('content-type') ?? 'application/octet-stream'
  return ctx.send.custom(object.body, {
    headers: {
      'Content-Type': contentType
    }
  })
}
```

This path runs the full middleware chain, so guarding it with [basic auth](/middleware/basic-auth) or a [session](/middleware/session) check happens before the bucket is ever touched.

## Signing Requests

A private bucket needs signed requests rather than a plain `fetch`. Two routes work well:

- **Presigned URL** - the SDK signs a short-lived URL, and the handler either redirects with [`ctx.send.redirect`](/response/redirect) or fetches it server-side.
- **Server-side SDK** - the official client signs each request, for example the [AWS SDK for JavaScript](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/welcome.html) for S3 or the Cloudflare R2 binding for [Workers](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/).

Whichever route signs the request, the response body still streams through `ctx.send.custom`, so the serving shape stays the same.

## Handling Failures

Object storage adds network calls that can time out or reject, so every fetch passes its failure to the [centralized error handler](/error-handling/object-details) instead of leaking a raw error. A missing object maps to **404**, while an upstream outage maps to **502** so the cause stays readable:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const endpoint: string
// ---cut---
export async function GET(ctx: Context): Promise<Response> {
  const key = ctx.get.param('key')
  try {
    const object = await fetch(`${endpoint}/${key}`)
    if (object.status === 404) {
      return await ctx.handleError(404, new Deno.errors.NotFound('Object not found'))
    }
    // Map an upstream failure to 502
    if (!object.ok || !object.body) {
      return await ctx.handleError(502, new Error('Object storage unavailable'))
    }
    return ctx.send.custom(object.body, {
      headers: {
        'Content-Type': 'application/octet-stream'
      }
    })
  } catch (error) {
    // Route any network fault through error handling
    return await ctx.handleError(502, error as Error)
  }
}
```

Shaping these into a single client response lives in [Error Handling](/error-handling/object-details), and capturing them for logs lives in [Error Reporting](/middleware/observability/errors).
