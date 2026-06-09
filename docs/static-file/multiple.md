---
description: "Serve static assets from multiple directories under different URL prefixes in Deserve."
---

# Multiple Directories

Serve static files from multiple directories with different configurations per path. Each call shares the same options and resolution rules covered in [Basic Static Serving](/static-file/basic).

## Basic Usage

Configure multiple static directories:

![Three static calls each bind one url prefix to its own folder with its own cache policy, where slash admin serves the admin slash dist folder with etag on and a one day cache, slash uploads serves the uploads folder with etag off and no cache, and slash docs serves the docs slash build folder with etag on and a one hour cache](/diagrams/static-multiple-dirs.png)

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()

// Each path gets its own folder and cache
router.static('/admin', {
  path: './admin/dist',
  etag: true,
  cacheControl: 86400
})
router.static('/uploads', {
  path: './uploads',
  etag: false,
  cacheControl: 0
})
router.static('/docs', {
  path: './docs/build',
  etag: true,
  cacheControl: 3600
})

await router.serve(8000)
```

## Common Patterns

![One request picks the static prefix it starts with, so GET slash uploads slash img slash a dot png matches the slash uploads pattern, has its prefix sliced off, and is served from the uploads folder with that prefix etag off and no cache, while the same tail under GET slash docs slash img slash a dot png matches the slash docs pattern instead and is served from docs slash build with etag on and a one hour cache, proving the matched prefix decides both folder and cache policy](/diagrams/static-prefix-dispatch.png)

### Website + Admin Panel

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Main website
router.static('/', {
  path: './public',
  etag: true,
  cacheControl: 86400
})

// Admin panel
router.static('/admin', {
  path: './admin/dist',
  etag: true,
  cacheControl: 86400
})
```

### Assets + Uploads

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Static assets with long-term caching
router.static('/assets', {
  path: './public/assets',
  etag: true,
  cacheControl: 31536000 // 1 year
})

// User uploads without caching
router.static('/uploads', {
  path: './uploads',
  etag: false,
  cacheControl: 0 // No cache
})
```

### Development + Production

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Development files - short cache
router.static('/dev', {
  path: './dev',
  etag: true,
  cacheControl: 0 // No cache for dev
})

// Production build - long cache
router.static('/', {
  path: './dist',
  etag: true,
  cacheControl: 31536000 // 1 year
})
```

## Directory Structure Examples

### Full-Stack Application

```
.
├── main.ts
├── public/
│   ├── index.html
│   ├── css/
│   └── js/
├── admin/
│   └── dist/
│       ├── index.html
│       └── assets/
├── uploads/
│   ├── images/
│   └── documents/
└── docs/
    └── build/
        ├── index.html
        └── assets/
```

### Microservices Frontend

```
.
├── main.ts
├── web/
│   └── dist/
├── api/
│   └── docs/
├── admin/
│   └── build/
└── mobile/
    └── public/
```

## Configuration Examples

### Different Caching Strategies

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Long-term cached assets (1 year)
router.static('/assets', {
  path: './public/assets',
  etag: true,
  cacheControl: 31536000
})

// Medium-term cache (1 day)
router.static('/images', {
  path: './public/images',
  etag: true,
  cacheControl: 86400
})

// No caching for dynamic uploads
router.static('/uploads', {
  path: './uploads',
  etag: false,
  cacheControl: 0
})
```

### Different ETag Settings

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Enable ETag for efficient caching
router.static('/static', {
  path: './public',
  etag: true,
  cacheControl: 86400
})

// Disable ETag for frequently changing files
router.static('/reports', {
  path: './reports',
  etag: false,
  cacheControl: 3600
})
```

## Troubleshooting

### Route Conflicts

Routes are registered for all HTTP methods (`GET`, `POST`, etc.). Make sure static routes don't conflict with dynamic routes:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
router.static('/', { path: './public' })
router.static('/admin', { path: './admin/dist' })
```

### File Not Found

- Check `path` values are correct (relative to cwd or absolute)
- Verify directory structure matches configuration
- Ensure files exist in the specified directories
- Check URL paths match the route pattern

### Performance Issues

- Enable `etag: true` for efficient caching
- Set appropriate `cacheControl` values based on content type
- Static assets: long cache (31536000 = 1 year)
- Dynamic content: short or no cache (0 or 3600)
