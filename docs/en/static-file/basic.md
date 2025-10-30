# Basic Static Serving

Serve static files (HTML, CSS, JS, images) using the `static()` method.

## Basic Usage

Serve static files from a directory:

```typescript
import { Router } from '@neabyte/deserve'

const router = new Router()

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
- `GET /static/js/app.js` → serves `public/js/app.js`

## How It Works

Deserve uses a custom static file serving implementation:

1. **Route Matching**: Creates routes with pattern `${urlPath}/**` to match all files
2. **Path Extraction**: Uses `ctx.pathname` directly to get the full request path (FastRouter's `/**` pattern only captures the first segment, so we use pathname instead)
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

```typescript
router.static('/static', {
  path: './public' // Serve files from public/ directory
})

router.static('/assets', {
  path: '/absolute/path/to/assets' // Absolute path also supported
})
```

### `etag`
Enable ETag generation for caching. Uses SHA-256 algorithm:

```typescript
router.static('/static', {
  path: './public',
  etag: true // Generate ETag headers using SHA-256
})
```

When enabled, Deserve generates ETag headers from content hash. If the client sends an `If-None-Match` header matching ETag, a `304 Not Modified` response is returned.

### `cacheControl`
Set Cache-Control header max-age in seconds:

```typescript
router.static('/static', {
  path: './public',
  cacheControl: 86400 // Cache for 1 day (86400 seconds)
})

router.static('/assets', {
  path: './assets',
  cacheControl: 31536000 // Cache for 1 year
})
```

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
