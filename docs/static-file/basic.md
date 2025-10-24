# Basic Static Serving

> **Reference**: [Deno HTTP Server Files](https://docs.deno.com/examples/http_server_files/)

Serve static files (HTML, CSS, JS, images) using the `static()` method.

## Basic Usage

Serve static files from a directory:

```typescript
import { Router } from '@neabyte/deserve'

const router = new Router()

// Serve static files from public directory
router.static('/', {
  fsRoot: 'public',
  showDirListing: true,
  enableCors: true
})

router.serve(8000)
```

This serves files from the `public/` directory at the root URL path:
- `GET /index.html` → serves `public/index.html`
- `GET /css/style.css` → serves `public/css/style.css`
- `GET /js/app.js` → serves `public/js/app.js`

## How It Works

Deserve uses Deno's `serveDir` from `@std/http` for static file serving:

1. **Route Matching**: Checks if the request URL starts with the configured `urlPath`
2. **File Resolution**: Maps URL paths to file system paths using `fsRoot`
3. **Automatic urlRoot**: Strips the leading `/` from URL path automatically
4. **Priority**: Static routes are checked before dynamic routes

## Static File Options

The `static()` method accepts all [ServeDirOptions](https://jsr.io/@std/http@1.0.21/doc/~/ServeDirOptions) from `@std/http`:

### `fsRoot`
File system root directory:

```typescript
router.static('/', {
  fsRoot: 'public' // Serve files from public/ directory
})
```

### `showDirListing`
Enable directory listing:

```typescript
router.static('/', {
  fsRoot: 'public',
  showDirListing: true // Show directory contents
})
```

### `showIndex`
Serve index.html as index:

```typescript
router.static('/', {
  fsRoot: 'public',
  showIndex: true // Serve index.html for directory requests
})
```

### `enableCors`
Enable CORS headers:

```typescript
router.static('/', {
  fsRoot: 'public',
  enableCors: true // Add CORS headers to responses
})
```

### `showDotfiles`
Serve dotfiles:

```typescript
router.static('/', {
  fsRoot: 'public',
  showDotfiles: true // Serve .htaccess, .env, etc.
})
```

### `etagAlgorithm`
ETag algorithm for caching:

```typescript
router.static('/', {
  fsRoot: 'public',
  etagAlgorithm: 'SHA-256' // Use SHA-256 for ETags
})
```

### `headers`
Additional headers to add:

```typescript
router.static('/', {
  fsRoot: 'public',
  headers: ['Cache-Control: public, max-age=31536000']
})
```

## Common Patterns

### Serve from Root
```typescript
// Serve files from public/ at root URL
router.static('/', {
  fsRoot: 'public',
  showDirListing: false,
  showIndex: true
})
```

### Serve from Subpath
```typescript
// Serve files from public/ at /static URL
router.static('/static', {
  fsRoot: 'public',
  showDirListing: false
})
```

### Assets Directory
```typescript
// Serve assets with caching headers
router.static('/assets', {
  fsRoot: 'public/assets',
  showDirListing: false,
  headers: ['Cache-Control: public, max-age=31536000'],
  etagAlgorithm: 'SHA-256'
})
```

## File Structure Examples

### Basic Website
```
project/
├── main.ts
├── public/
│   ├── index.html
│   ├── about.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js
└── routes/
    └── api/
        └── users.ts
```

### SPA (Single Page Application)
```
project/
├── main.ts
├── public/
│   ├── index.html
│   ├── assets/
│   │   ├── app.js
│   │   └── app.css
│   └── images/
│       └── logo.png
└── routes/
    └── api/
        └── data.ts
```

## Best Practices

1. **Use specific paths** - Avoid serving from root unless necessary
2. **Disable directory listing** - Set `showDirListing: false` in production
3. **Add caching headers** - Use appropriate cache headers for assets
4. **Handle index files** - Enable `showIndex` for directory requests
5. **Use ETags** - Enable ETags for efficient caching
6. **Separate assets** - Use different paths for different asset types
7. **Security** - Disable `showDotfiles` in production

## Troubleshooting

### Files Not Found
- Check `fsRoot` path is correct
- Verify file permissions
- Ensure files exist in the directory

### Directory Listing Not Working
- Set `showDirListing: true`
- Check file permissions on directory
- Verify `fsRoot` points to correct directory

### CORS Issues
- Set `enableCors: true` for cross-origin requests
- Use route-specific CORS middleware if needed

### Caching Problems
- Check `etagAlgorithm` setting
- Verify cache headers are correct
- Clear browser cache for testing

## Next Steps

- [Multiple Directories](/static-file/multiple) - Serve from multiple directories
- [Global Middleware](/middleware/global) - Cross-cutting functionality
- [Route-Specific Middleware](/middleware/route-specific) - Targeted middleware
