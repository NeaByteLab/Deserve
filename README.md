# Deserve [![Deno](https://img.shields.io/badge/Deno-2.5.4-blue)](https://deno.land) [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

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

## Error Handling

Customize 404 and 501 error responses with error middleware:

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

Add middleware to the request pipeline.

##### `onError(middleware: ErrorMiddleware): void`

Set error middleware for custom 404 and 501 responses.

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
type RouterMiddleware = (req: Request) => Response | null
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
