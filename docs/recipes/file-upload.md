---
description: 'Receive multipart uploads, pull files out of FormData, and store them on disk in Deserve.'
---

# File Uploads

A file upload is just a request body carrying a `multipart/form-data` content type, so the same [request handling](/core-concepts/request-handling) readers that parse JSON or text also unpack uploaded files. Deserve leans on the native [Web FormData API](https://developer.mozilla.org/en-US/docs/Web/API/FormData), so an uploaded file lands as a standard [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File) object with its bytes, name, and type already attached.

## Project Structure

The upload handler lives in the [routes directory](/core-concepts/file-based-routing) while saved files rest in a sibling `uploads` folder that [static serving](/static-file/multiple) hands back. The server entry wires both together:

```
.
├── main.ts                  → Router setup and serve
├── routes/
│   └── api/
│       └── upload.ts        → POST /api/upload
└── uploads/                 → Saved files land here
```

## Reading the Upload

A multipart request flows through `ctx.formData()`, and each named field comes back from `form.get()`. A text field returns a string while a file field returns a `File`:

```typescript twoslash
import type { Context } from '@neabyte/deserve'

// POST /api/upload with multipart form
export async function POST(ctx: Context): Promise<Response> {
  const form = await ctx.formData()
  const title = form.get('title') // Text field as string
  const file = form.get('file') // File or string or null

  // Echo back both field types
  return ctx.send.json({
    title,
    filename: file instanceof File ? file.name : null
  })
}
```

Calling `ctx.body()` reaches the same parser, since it reads the `Content-Type` header and routes both `multipart/form-data` and `application/x-www-form-urlencoded` into `FormData`. Reaching for `ctx.formData()` keeps the intent clear at the call site.

## Confirming a File Arrived

`form.get()` hands back `null` for a missing field and a string for a text field, so an `instanceof File` check separates a real upload from the rest before any work runs:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export async function POST(ctx: Context): Promise<Response> {
  const form = await ctx.formData()
  const file = form.get('file')

  // Reject when no file was sent
  if (!(file instanceof File)) {
    return ctx.send.json(
      {
        error: 'No file uploaded'
      },
      {
        status: 400
      }
    )
  }

  // Metadata travels with the File
  return ctx.send.json({
    name: file.name,
    type: file.type,
    size: file.size
  })
}
```

The `File` exposes its own `name`, `type`, and `size`, so reporting back on an upload never has to touch the disk.

A handler that checks several fields can move those checks ahead of itself with a [validation](/middleware/validation/overview) contract on the `body` source, so only a request that already carries the right fields reaches the handler.

## Saving to Disk

The bytes stay inside the `File` until `arrayBuffer()` pulls them out, and wrapping that buffer in a `Uint8Array` hands [`Deno.writeFile`](https://docs.deno.com/api/deno/~/Deno.writeFile) exactly the shape it expects. Deserve never writes uploads on its own, so the destination path stays under full control:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export async function POST(ctx: Context): Promise<Response> {
  const form = await ctx.formData()
  const file = form.get('file')

  // Reject when no file was sent
  if (!(file instanceof File)) {
    return ctx.send.json(
      {
        error: 'No file uploaded'
      },
      {
        status: 400
      }
    )
  }

  // Read raw bytes from the File
  const bytes = new Uint8Array(await file.arrayBuffer())

  // Unique name avoids overwrites
  const path = `./uploads/${crypto.randomUUID()}-${file.name}`
  await Deno.writeFile(path, bytes)

  // Report what landed on disk
  return ctx.send.json({
    saved: file.name,
    size: file.size
  })
}
```

Writing to disk needs Deno's write permission, so the server runs with `--allow-write` or a scoped `--allow-write=./uploads` for the folder the handler targets.

## Reading the Body Once

Each Context parses its body a single time then caches the result, so a second reader in a different format on the same request throws instead of handing back empty data. Picking one of `formData()`, `json()`, `text()`, `arrayBuffer()`, or `blob()` per request keeps that contract:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export async function POST(ctx: Context): Promise<Response> {
  const form = await ctx.formData() // Body consumed once here

  // Reads cached form, not body
  return ctx.send.json({
    fields: [...form.keys()]
  })
}
```

A second reader such as `ctx.json()` on this request would throw instead of returning empty data, since the body is already gone. A malformed multipart payload never crashes the pipeline either, since the parser maps a broken body to a **400** that flows through the [centralized error handler](/error-handling/object-details). Every reader and its return type lives in the [request handling reference](/core-concepts/request-handling#method-reference).

## Capping Upload Size

`FormData` puts no ceiling on how many bytes a client sends, so an upload route pairs with [body limit middleware](/middleware/body-limit) to reject oversized payloads with a **413** before they fill memory. A known `Content-Length` over the cap is rejected before the body is read, while a chunked stream is cut off as soon as the extra bytes arrive:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router({
  routesDir: './routes'
})

// Cap the upload route at 5MB
router.use(
  '/api/upload',
  Mware.bodyLimit({
    limit: 5 * 1024 * 1024
  })
)

await router.serve(8000)
```

## Serving Uploads Back

Files saved under `./uploads` become reachable again through [static serving](/static-file/multiple), where a URL prefix maps to a folder on disk. User uploads change often, so an `etag: false` and `cacheControl: 0` policy keeps stale copies out of the browser:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Serve saved uploads without caching
router.static('/uploads', {
  path: './uploads',
  etag: false,
  cacheControl: 0
})
```

For a one-off download driven by a handler instead of a static prefix, [`ctx.send.file()`](/response/file) streams a single file straight off disk with the right `Content-Disposition` attached.

## Full Round Trip

Two files carry the whole flow. The `main.ts` entry caps the size at the router and exposes the saved folder, while the route file at `routes/api/upload.ts` validates the field, stores the bytes, and reports the public URL back. Deserve wires them together through [file-based routing](/core-concepts/file-based-routing), so the route file never gets imported by hand.

First the server entry that sets up the router:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

// main.ts entry point
const router = new Router({
  routesDir: './routes'
})

// Guard size before the handler runs
router.use(
  '/api/upload',
  Mware.bodyLimit({
    limit: 5 * 1024 * 1024
  })
)

// Serve stored files back to clients
router.static('/uploads', {
  path: './uploads',
  etag: false,
  cacheControl: 0
})

await router.serve(8000)
```

Then the route file that handles the upload:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
// routes/api/upload.ts handler
export async function POST(ctx: Context): Promise<Response> {
  const form = await ctx.formData()
  const file = form.get('file')

  // Reject when no file was sent
  if (!(file instanceof File)) {
    return ctx.send.json(
      {
        error: 'No file uploaded'
      },
      {
        status: 400
      }
    )
  }

  // Read bytes, then write unique name
  const bytes = new Uint8Array(await file.arrayBuffer())
  const name = `${crypto.randomUUID()}-${file.name}`
  await Deno.writeFile(`./uploads/${name}`, bytes)

  // Return the public download URL
  return ctx.send.json({
    url: `/uploads/${name}`,
    size: file.size
  })
}
```
