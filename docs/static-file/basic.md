---
description: "Serve static files from a directory with the Deserve static handler."
---

# Basic Static Serving

The `router.static()` method serves files from a folder under a URL prefix, with caching, byte ranges, and path safety built in. It covers HTML, CSS, JavaScript, images, fonts, and any other asset on disk.

## Basic Usage

Mount a folder under a URL prefix:

![A request to slash static slash css slash style dot css matches the slash static mount, has its slash static prefix stripped to css slash style dot css, and is served from the public folder, while a request to slash static slash dot env is rejected with 404 before any read because the segment starts with a dot](/diagrams/static-url-to-file.png)

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()

// Serve ./public under the /static prefix
router.static('/static', {
  path: './public',
  etag: true,
  cacheControl: 86400
})

await router.serve(8000)
```

That mount maps each URL under `/static` to a file in `public/`:

- `GET /static/index.html` serves `public/index.html`
- `GET /static/css/style.css` serves `public/css/style.css`
- `GET /static/.env` is rejected with **404** before any read

## How It Works

A static mount is not a file route. It is a separate registry that the router checks only after dynamic routes miss, so the matching order is fixed:

1. Entry middleware runs first.
2. A matching dynamic route handles the request and static never runs.
3. When the path matches a route under a different method, the router replies **405 Method Not Allowed** with an `Allow` header, and static still never runs.
4. With no route match at all, the router walks the static mounts and serves the first one whose prefix covers the path.

A request keeps its prefix until a mount matches, then the prefix is stripped and the remainder becomes the file path under the folder. So `GET /static/css/style.css` strips `/static` and resolves `css/style.css` inside `public/`.

### Prefix Matching

Mounts are sorted longest prefix first, so the most specific one wins. A mount on `/admin/assets` is tried before a mount on `/admin`, which lets a broad fallback and a focused folder live together. A mount on `/` acts as a catch-all that covers every remaining path. Multiple mounts and their dispatch order live in [Multiple Directories](/static-file/multiple).

### Supported Methods

A static mount answers `GET` and `HEAD` only. Any other method on a path the mount covers returns **405 Method Not Allowed** with `Allow: GET, HEAD`. A `HEAD` request runs the same path as `GET` and returns the headers with an empty body.

## Static File Options

The second argument is a `ServeOptions` object. Only `path` is required:

### `path`

The filesystem directory to serve from, relative to the current working directory or absolute. An empty path throws at mount time:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
router.static('/static', {
  path: './public' // Serve files from public folder
})

router.static('/assets', {
  path: '/absolute/path/to/assets' // Absolute path also works
})
```

### `etag`

Turns on ETag generation, and it defaults to on when omitted. The tag is a weak validator built from a SHA-256 hash of the file size and modification time, not the file contents, so it stays cheap to compute:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
router.static('/static', {
  path: './public',
  etag: true // Build ETag from size and mtime
})
```

When a client sends a matching `If-None-Match`, the response is **304 Not Modified** with no body. A client sending `If-Modified-Since` gets the same 304 when the file is no newer than that date.

### `cacheControl`

Sets the `Cache-Control` max-age in seconds, sent as `public, max-age=<seconds>`. It applies only when the value is `0` or higher, and is omitted otherwise:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
router.static('/static', {
  path: './public',
  cacheControl: 86400 // Cache for one day
})

router.static('/assets', {
  path: './assets',
  cacheControl: 31536000 // Cache for one year
})
```

## Custom Handler

In place of options, `static()` accepts a function of the shape `(ctx, urlPath) => Response`. It receives the [context](/core-concepts/context-object) and the path with the mount prefix already stripped, which suits an in-memory asset map or a generated file:

```typescript twoslash
import { Router, type Context } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Serve assets from a map by stripped path
router.static('/cdn', (ctx: Context, urlPath: string) => {
  const assets: Record<string, string> = { 'logo.svg': '<svg></svg>' }
  const body = assets[urlPath]
  if (body === undefined) {
    return ctx.send.empty(404)
  }
  return ctx.send.custom(body, { headers: { 'Content-Type': 'image/svg+xml' } })
})
```

## Byte-Range Requests

Static responses support a single [byte range](https://www.rfc-editor.org/rfc/rfc7233) so a client can fetch part of a file, which is what a video scrubber or a resumable download relies on. Every static response advertises `Accept-Ranges: bytes`:

- A single valid range returns **206 Partial Content** with `Content-Range: bytes start-end/size`, streaming only those bytes off disk.
- A range past the file size returns **416 Range Not Satisfiable** with `Content-Range: bytes */size`.
- An absent, multi-part, or malformed range falls back to the full file.

An `If-Range` header carrying a date keeps the range only when the file is unchanged, otherwise the full file is sent. An `If-Range` carrying an entity tag is treated as stale, so the full file is sent. The file handle is released once the window is sent, errors, or is cancelled.

## File Resolution and Security

A mount maps a URL to a file under its folder with a few fixed rules:

- **Index fallback** - a request to the mount root serves `index.html` from the folder.
- **Content type** - the type comes from the file extension. Common web assets such as HTML, CSS, JavaScript, JSON, images, fonts, and documents are mapped out of the box, and an unknown extension falls back to `application/octet-stream`.
- **Dotfiles blocked** - any path segment whose name starts with `.` is rejected with **404**, so `.env`, `.git/config`, or a leading `..` never get served. The rule reads the segment name, not the extension, so a normal file like `report.env` is still served.
- **Traversal blocked** - the resolved real path must stay inside the folder. A path that escapes through `..` or a symlink is rejected with **404**.

A miss or a blocked path emits a `static:missing` event on the [observability bus](/middleware/observability/overview) and returns **404** through the [centralized error handler](/error-handling/object-details), the same handler set with `router.catch()` that shapes every other error. There is no per-mount error hook, so one handler covers static, routes, and middleware alike.

## Troubleshooting

A few common misses and what to check:

- **404 on a file that exists** - confirm `path` points at the right folder and the URL keeps the mount prefix, so `/static/app.css` for a mount on `/static`.
- **404 on a dotfile** - this is intentional, since any segment starting with `.` is blocked.
- **A route wins over a static file** - a dynamic route on the same path takes priority, so rename one or move the static mount under a distinct prefix.
- **Caching not applied** - check the `ETag` and `Cache-Control` headers in the browser network panel, and confirm `etag` and `cacheControl` are set.
