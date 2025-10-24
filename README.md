# Deserve [![Deno](https://img.shields.io/badge/Deno-2.5.4-blue)](https://deno.land) [![JSR](https://jsr.io/badges/@neabyte/deserve)](https://jsr.io/@neabyte/deserve) [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

HTTP server with file-based routing library for Deno that supports middleware and all dynamic routing.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
  - [Basic Usage](#basic-usage)
  - [With Custom Configuration](#with-custom-configuration)
- [File-based Routing](#file-based-routing)
  - [Basic Routes](#basic-routes)
  - [Dynamic Routes](#dynamic-routes)
  - [Supported HTTP Methods](#supported-http-methods)
- [Middleware](#middleware)
  - [Global Middleware](#global-middleware)
  - [Route-Specific Middleware](#route-specific-middleware)
- [Built-in Middleware](#built-in-middleware)
  - [CORS Middleware](#cors-middleware)
- [Static File Serving](#static-file-serving)
  - [Basic Static Serving](#basic-static-serving)
  - [Advanced Static Configuration](#advanced-static-configuration)
  - [Multiple Static Directories](#multiple-static-directories)
  - [Static File Options](#static-file-options)
- [Error Handling](#error-handling)
  - [Error Object Details](#error-object-details)
  - [Catching Route Handler Errors](#catching-route-handler-errors)
- [API Reference](#api-reference)
  - [Router Class](#router-class)
    - [Constructor](#constructor)
    - [Methods](#methods)
  - [Types](#types)
    - [ErrorMiddleware](#errormiddleware)
    - [RouterHandler](#routerhandler)
    - [RouterMiddleware](#routermiddleware)
    - [RouterOptions](#routeroptions)
- [Contributing](#contributing)
- [License](#license)

## Installation

```bash
deno add jsr:@neabyte/deserve
```

## Quick Start

### Basic Usage

```typescript
import { Router } from '@neabyte/deserve'

// Create a new router
const router = new Router()

// Start the server
router.serve(8000)
```

### With Custom Configuration

```typescript
import { Router } from '@neabyte/deserve'

// Create a new router with custom configuration
const router = new Router({
  prefix: 'routes',   // Route files directory
  extension: '.ts'    // File extension for routes
})

// Start the server
router.serve(8000)
```

## File-based Routing

Create route files in your `routes` directory (or custom prefix) to define endpoints:

### Basic Routes

**`routes/index.ts`**

```typescript
export function GET(req: Request): Response {
  return new Response(JSON.stringify({ message: 'Hello World' }))
}

export function POST(req: Request): Response {
  return new Response(JSON.stringify({ message: 'Created' }))
}
```

### Dynamic Routes

Use `[param]` syntax for dynamic parameters:

**`routes/users/[id].ts`**

```typescript
export const GET = (req: Request, params: Record<string, string>) => {
  const { id } = params
  return new Response(JSON.stringify({ userId: id }), {
    headers: { 'Content-Type': 'application/json' }
  })
}
```

**`routes/users/[id]/posts/[postId].ts`**

```typescript
export const GET = (req: Request, params: Record<string, string>) => {
  const { id, postId } = params
  return new Response(JSON.stringify({ userId: id, postId }), {
    headers: { 'Content-Type': 'application/json' }
  })
}
```

### Supported HTTP Methods

Export any of these HTTP methods from your route files:

- `GET`
- `POST`
- `PUT`
- `PATCH`
- `DELETE`
- `HEAD`
- `OPTIONS`

## Middleware

Deserve supports both global and route-specific middleware. Middleware executes in the following order:

1. **Route-specific middleware** - Applied to matching route patterns
2. **Global middleware** - Applied to all routes
3. **Route handlers** - Execute the actual route logic

### Global Middleware

Add global middleware to process requests before they reach route handlers:

```typescript
import { Router } from '@neabyte/deserve'

// Create a new router
const router = new Router()

// CORS middleware
router.use((req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    })
  }
  return null // Continue to next middleware/route
})

// Authentication middleware
router.use((req: Request) => {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401 })
  }
  return null // Continue if authorized
})

// Start the server
router.serve(8000)
```

### Route-Specific Middleware

Apply middleware to specific route patterns using the same `use()` method with a route path:

```typescript
import { Router } from '@neabyte/deserve'

const router = new Router()

// Global middleware (applies to ALL routes)
router.use((req: Request) => {
  console.log(`🌐 [GLOBAL] ${req.method} ${req.url}`)
  return null
})

// Route-specific middleware
router.use('/api', (req: Request) => {
  const token = req.headers.get('Authorization')
  if (!token) {
    return new Response('Unauthorized', { status: 401 })
  }
  console.log('✅ API route authenticated')
  return null
})

router.use('/api/admin', (req: Request) => {
  const role = req.headers.get('X-User-Role')
  if (role !== 'admin') {
    return new Response('Forbidden', { status: 403 })
  }
  console.log('✅ Admin route authorized')
  return null
})

router.use('/public', (req: Request) => {
  console.log('🌍 Public route accessed')
  return null
})

// Start the server
router.serve(8000)
```

**Route Pattern Matching:**
- `router.use('/api', middleware)` - Applies to `/api/*` routes
- `router.use('/api/admin', middleware)` - Applies to `/api/admin/*` routes
- `router.use('/public', middleware)` - Applies to `/public/*` routes

**Multiple Middleware per Route:**
```typescript
// Apply multiple middleware to the same route
router.use('/api', authMiddleware)
router.use('/api', rateLimitMiddleware)
router.use('/api', corsMiddleware)
```

**Middleware Composition:**
```typescript
// Compose middleware for cleaner code
const apiMiddleware = (req: Request) => {
  // Run auth check
  const authResult = authMiddleware(req)
  if (authResult) {
    return authResult
  }

  // Run rate limiting
  const rateLimitResult = rateLimitMiddleware(req)
  if (rateLimitResult) {
    return rateLimitResult
  }

  // ... more middleware ...
}

// Apply middleware to the API route
router.use('/api', apiMiddleware)
```

## Built-in Middleware

Deserve includes built-in middleware that can be applied using the `apply()` method:

#### CORS Middleware

```typescript
import { Router } from '@neabyte/deserve'

// Create a new router
const router = new Router()

// Apply CORS with default settings
router.apply(['cors'])

// Apply CORS with custom configuration
router.apply([['cors', {
  origin: ['https://example.com', 'https://app.example.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  headers: ['Content-Type', 'Authorization', 'X-Custom-Header'],
  credentials: true,
  maxAge: 3600
}]])

// Start the server
router.serve(8000)
```

## Static File Serving

Serve static files (HTML, CSS, JS, images, etc.) from directories using the `static()` method:

### Basic Static Serving

```typescript
import { Router } from '@neabyte/deserve'

// Create a new router
const router = new Router()

// Serve static files from public directory
router.static('/', {
  fsRoot: 'public',
  showDirListing: true,
  enableCors: true
})

// Start the server
router.serve(8000)
```

This serves files from the `public/` directory at the root URL path:
- `GET /index.html` → serves `public/index.html`
- `GET /css/style.css` → serves `public/css/style.css`
- `GET /js/app.js` → serves `public/js/app.js`

**Note:** The `urlRoot` parameter is automatically set to strip the leading `/` from the URL path, so you don't need to specify it manually.

### Advanced Static Configuration

```typescript
import { Router } from '@neabyte/deserve'

// Create a new router
const router = new Router()

// Serve static files with custom URL path
router.static('/static', {
  fsRoot: 'public',
  showDirListing: false,
  enableCors: true,
  headers: ['Cache-Control: public, max-age=31536000']
})

// Serve assets with different configuration
router.static('/assets', {
  fsRoot: 'public/assets',
  showDirListing: false,
  enableCors: true,
  etagAlgorithm: 'SHA-256'
})

// Start the server
router.serve(8000)
```

### Multiple Static Directories

```typescript
import { Router } from '@neabyte/deserve'

// Create a new router
const router = new Router()

// Admin panel static files
router.static('/admin', {
  fsRoot: 'admin/dist',
  showDirListing: false,
  showIndex: true
})

// User uploads
router.static('/uploads', {
  fsRoot: 'uploads',
  showDirListing: true,
  enableCors: false
})

// API documentation
router.static('/docs', {
  fsRoot: 'docs/build',
  showDirListing: false,
  showIndex: true
})

// Start the server
router.serve(8000)
```

### Static File Options

The `static()` method accepts all [ServeDirOptions](https://jsr.io/@std/http@1.0.21/doc/~/ServeDirOptions) from `@std/http`:

- `fsRoot` - File system root directory (default: ".")
- `urlRoot` - Strip this from URL path before serving
- `showDirListing` - Enable directory listing (default: false)
- `showDotfiles` - Serve dotfiles (default: false)
- `showIndex` - Serve index.html as index (default: true)
- `enableCors` - Enable CORS headers (default: false)
- `quiet` - Disable request logs (default: false)
- `etagAlgorithm` - ETag algorithm (default: "SHA-256")
- `headers` - Additional headers to add

## Error Handling

Customize 404, 500, 501 error responses with error middleware:

```typescript
import { Router } from '@neabyte/deserve'

// Create a new router
const router = new Router()

// Custom error handling
router.onError((req, error) => {
  // Handle different error types
  switch (error.statusCode) {
    case 404:
      return new Response(JSON.stringify({
        error: 'Not Found',
        path: error.path,
        timestamp: new Date().toISOString()
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    case 501:
      return new Response(JSON.stringify({
        error: 'Method Not Allowed',
        method: error.method,
        path: error.path
      }), {
        status: 501,
        headers: { 'Content-Type': 'application/json' }
      })
    case 500:
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: error.error?.message || 'Something went wrong',
        path: error.path,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    default:
      return null // Use default behavior for other errors
  }
})

// Start the server
router.serve(8000)
```

### Error Object Details

The error middleware provides complete error information:

- `error.statusCode` - HTTP status code (404, 500, 501, etc.)
- `error.path` - Full request URL
- `error.method` - HTTP method (GET, POST, etc.)
- `error.error` - Full Error object with:
  - `error.error.message` - Error message
  - `error.error.name` - Error type (Error, TypeError, etc.)
  - `error.error.stack` - Complete stack trace

### Catching Route Handler Errors

The error middleware also catches uncaught exceptions from your route handlers:

```typescript
// routes/users/[id].ts
export const GET = async (req: Request, params: Record<string, string>) => {
  const { id } = params
  // This will be caught by error middleware if it throws
  if (id === 'invalid') {
    throw new Error('Invalid user ID')
  }
  return new Response(JSON.stringify({ userId: id }))
}
```

```typescript
// main.ts
router.onError((req, error) => {
  if (error.statusCode === 500) {
    console.log('Error details:', error.error?.message)
    console.log('Stack trace:', error.error?.stack)
    return new Response(JSON.stringify({
      error: 'Something went wrong',
      message: error.error?.message || 'Unknown error',
      path: error.path,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  return null
})
```

## API Reference

### Router Class

#### Constructor

```typescript
new Router(options?: RouterOptions)
```

**Options:**

- `prefix: string` - Directory name containing route files (default: `routes`)
- `extension: string` - File extension for route files (default: `.ts`)

#### Methods

##### `serve(port?: number): Promise<void>`

Start the HTTP server on the specified port (default: 8000).

##### `use(middleware: RouterMiddleware): void`

Add global middleware to the request pipeline.

##### `use(routePath: string, middleware: RouterMiddleware): void`

Add route-specific middleware to the request pipeline.

**Parameters:**
- `routePath` - Route path pattern to apply middleware to (e.g., `/api`, `/admin`)
- `middleware` - Middleware function to execute for matching routes

**Examples:**
```typescript
// Global middleware
router.use((req: Request) => {
  console.log('Global middleware')
  return null
})

// Route-specific middleware
router.use('/api', (req: Request) => {
  console.log('API middleware')
  return null
})
```

##### `onError(middleware: ErrorMiddleware): void`

Set error middleware for custom 404 and 501 responses.

##### `static(urlPath: string, options?: ServeDirOptions): void`

Serve static files from a directory. Accepts all [ServeDirOptions](https://jsr.io/@std/http@1.0.21/doc/~/ServeDirOptions) from `@std/http`.

**Parameters:**
- `urlPath` - URL path to serve files from
- `options` - Static file serving options (optional)

**Example:**
```typescript
router.static('/static', {
  fsRoot: 'public',
  urlRoot: 'static',
  showDirListing: true,
  enableCors: true
})
```

### Types

#### `ErrorMiddleware`

```typescript
type ErrorMiddleware = (
  req: Request,
  error: {
    path: string
    method: string
    statusCode: number
    error?: Error
  }
) => Response | null
```

#### `RouterHandler`

```typescript
type RouterHandler = (req: Request, params: Record<string, string>) => Response | Promise<Response>
```

#### `RouterMiddleware`

```typescript
type RouterMiddleware = (req: Request, res?: Response) => Response | null
```

#### `RouterOptions`

```typescript
interface RouterOptions {
  prefix: string
  extension: string
}
```

## Contributing

Contributions are welcome! Please feel free to submit a [Pull Request](https://github.com/NeaByteLab/Deserve/pulls).

## License

This project is licensed under the MIT license. See the [LICENSE](LICENSE) file for more info.
