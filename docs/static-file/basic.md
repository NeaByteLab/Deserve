---
description: "Serve static files from a directory with the Deserve static handler."
---

# Basic Static Serving

Serve static files (HTML, CSS, JS, images) using the `static()` method.

## Basic Usage

Serve static files from a directory:

![Calling router.static with the prefix slash static and path dot slash public registers the pattern slash static slash star star, then each request has its slash static prefix sliced off ctx.pathname and the remainder joined under public, so slash static maps to public slash index dot html, slash static slash css slash style dot css maps to public slash css slash style dot css, and slash static slash dot env is rejected with 404 before any read because the segment starts with a dot](/diagrams/static-url-to-file.png)

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()

// Serve ./public under the /static path
router.static('/static', {
  path: './public',
  etag: true,
  cacheControl: 86400
})

await router.serve(8000)
```

This serves files from the `public/` directory at the `/static` URL path:

- `GET /static/index.html` → serves `public/index.html`
- `GET /static/css/style.css` → serves `public/css/style.css`
- `GET /static/.env` → rejected with **404** before any read


## How It Works

Deserve uses a custom static file serving implementation:

1. **Route Matching**: Creates routes with pattern `${urlPath}/**` to match all files
2. **Path Extraction**: reads `ctx.pathname` directly to get the full request path, since FastRouter's `/**` pattern only captures the first segment
3. **File Resolution**: Maps URL paths to file system paths using the `path` option
4. **Priority**: Static routes are registered for all HTTP methods before dynamic routes

### Wildcard Pattern Behavior

When `urlPath` is `/`, Deserve creates a `/**` pattern. For path resolution, Deserve uses `ctx.pathname` instead of relying on wildcard parameter, because:

- FastRouter's `/**` pattern only captures the **first segment** of the request path instead of the full path (e.g., `"styles"` for `/styles/ui.css`)
- To serve nested files correctly, Deserve extracts the full path from `ctx.pathname` and removes the leading `/` to get the relative file path

**Example:**

- Request: `GET /styles/ui.css`
- Pattern: `/**` matches from configurable path
- File path: Extracted from `ctx.pathname` → `"styles/ui.css"`
- Resolved: `static/styles/ui.css`

## Static File Options

The `static()` method accepts a `ServeOptions` object:

### `path`

File system directory path to serve files from:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
router.static('/static', {
  path: './public' // Serve files from public/ directory
})

router.static('/assets', {
  path: '/absolute/path/to/assets' // Absolute path also supported
})
```

### `etag`

Enable ETag generation for caching. The tag is a SHA-256 hash of the file size and modification time, not the full file content, so it stays cheap to compute:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
router.static('/static', {
  path: './public',
  etag: true // Generate ETag from size and mtime
})
```

When enabled, a client that sends a matching `If-None-Match` header receives a `304 Not Modified` response with no body.

### `cacheControl`

Set the Cache-Control max-age in seconds. Deserve sends it as `public, max-age=<seconds>`, applied only when the value is `0` or higher:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
router.static('/static', {
  path: './public',
  cacheControl: 86400 // Cache for 1 day (86400 seconds)
})

router.static('/assets', {
  path: './assets',
  cacheControl: 31536000 // Cache for 1 year
})
```

## Byte-Range Requests

Static responses support a single [byte range](https://www.rfc-editor.org/rfc/rfc7233) so a client can fetch part of a file, which is what a video scrubber or a resumable download relies on. Every static response advertises `Accept-Ranges: bytes`, and a request carrying one contiguous `Range` header is answered with the matched window:

- **One valid range** returns **206 Partial Content** with a `Content-Range: bytes start-end/size` header and only those bytes streamed off disk.
- **An unsatisfiable range** that names a window past the file size returns **416 Range Not Satisfiable** with `Content-Range: bytes */size`.
- **An absent, multi-part, or malformed range** falls back to the full file as before.

Only the bytes inside the requested window are read, and the file handle is released once the window is sent, errors, or is cancelled.

## File Resolution and Security

Static serving maps a URL path to a file under the configured directory, with a few built-in rules:

- **Index fallback** - a request to the route root serves `index.html` from the directory.
- **Content type** - the type is picked from the file extension. Common web assets like HTML, CSS, JavaScript, JSON, images, fonts, and documents are mapped out of the box, and an unknown extension falls back to `application/octet-stream`.
- **Dotfiles blocked** - any path segment whose name starts with `.` is rejected with **404**, so files like `.env`, `.git/config`, or a leading `..` never get served. The rule looks at the segment name, not the extension, so a normal file such as `report.env` is still served.
- **Directory traversal blocked** - the resolved real path must stay inside the base directory. A path that escapes it, such as one built from `..`, is rejected with **404**.

A missing or blocked file returns 404 through the [centralized error handler](/error-handling/object-details).

## Troubleshooting

### Files Not Found

- Check `path` is correct (relative to current working directory or absolute)
- Verify file permissions
- Ensure files exist in the directory
- Check that the URL path matches the route pattern (`/static/file.css` for `router.static('/static', ...)`)

### 404 Errors

- Verify the static route is registered before calling `router.serve()`
- Check that file paths match the URL structure
- Ensure the file exists at the resolved path

### Caching Issues

- Verify `etag` and `cacheControl` are set correctly
- Check browser DevTools Network tab for ETag and Cache-Control headers
- Clear browser cache for testing
- Use `304 Not Modified` responses (visible when ETag matches)
