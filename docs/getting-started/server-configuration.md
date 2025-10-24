# Server Configuration

> **Reference**: [Deno.serve API Documentation](https://docs.deno.com/api/deno/~/Deno.serve)

Configure your Deserve server with hostname binding and graceful shutdown.

## Basic Server Setup

The simplest way to start a server:

```typescript
import { Router } from '@neabyte/deserve'

const router = new Router()

// Start server on default port 8000
await router.serve(8000)
```

This starts your server on `0.0.0.0:8000` (all interfaces).

## Enhanced Serve Method

Deserve's enhanced `serve` method supports three parameters:

```typescript
// Method signatures
async serve(port: number): Promise<void>
async serve(port: number, hostname?: string): Promise<void>
async serve(port: number, hostname?: string, signal?: AbortSignal): Promise<void>
```

## Hostname Binding

### Bind to Specific Interface

```typescript
// Bind to localhost only
await router.serve(8000, '127.0.0.1')

// Bind to all interfaces (default)
await router.serve(8000, '0.0.0.0')

// Bind to specific network interface
await router.serve(8000, '192.168.1.100')
```

### Development vs Production

```typescript
// Development - localhost only
await router.serve(8000, '127.0.0.1')

// Production - all interfaces
await router.serve(8000, '0.0.0.0')
```

## Graceful Shutdown

Use `AbortSignal` for graceful server shutdown:

```typescript
import { Router } from '@neabyte/deserve'

const router = new Router()
const ac = new AbortController()

// Start server with abort signal
await router.serve(8000, '127.0.0.1', ac.signal)

// Graceful shutdown
console.log('Shutting down server...')
ac.abort()
```

### Process Signal Handling

```typescript
import { Router } from '@neabyte/deserve'

const router = new Router()
const ac = new AbortController()

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...')
  ac.abort()
})

// Handle SIGTERM
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...')
  ac.abort()
})

await router.serve(8000, '127.0.0.1', ac.signal)
```

## Environment-Based Configuration

### Using Environment Variables

```typescript
import { Router } from '@neabyte/deserve'

const router = new Router()

const port = parseInt(Deno.env.get('PORT') ?? '8000')
const hostname = Deno.env.get('HOSTNAME') ?? '0.0.0.0'

await router.serve(port, hostname)
```

### Development Configuration

```typescript
// main.ts
import { Router } from '@neabyte/deserve'

const router = new Router()

const isDev = Deno.env.get('NODE_ENV') === 'development'
const port = isDev ? 3000 : 8000
const hostname = isDev ? '127.0.0.1' : '0.0.0.0'

await router.serve(port, hostname)
```

## Port Management

### Dynamic Port Assignment

```typescript
// Let the system assign an available port
await router.serve(0, '127.0.0.1')
```

### Port Validation

```typescript
const port = parseInt(Deno.env.get('PORT') ?? '8000')

// Validate port range
if (port < 1 || port > 65535) {
  throw new Error('Port must be between 1 and 65535')
}

await router.serve(port)
```

## Error Handling

### Invalid Hostname

```typescript
// ❌ Invalid hostname
await router.serve(8000, 'invalid-hostname')
// Will throw network error

// ✅ Valid hostname
await router.serve(8000, '127.0.0.1')
```

### Port Already in Use

```typescript
try {
  await router.serve(8000)
} catch (error) {
  if (error.message.includes('EADDRINUSE')) {
    console.log('Port 8000 is already in use')
    // Try alternative port
    await router.serve(8001)
  }
}
```

## Complete Example

Here's a production-ready server configuration:

```typescript
// main.ts
import { Router } from '@neabyte/deserve'

const router = new Router()
const ac = new AbortController()

// Configuration from environment
const port = parseInt(Deno.env.get('PORT') ?? '8000')
const hostname = Deno.env.get('HOSTNAME') ?? '0.0.0.0'

// Graceful shutdown handlers
process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down...')
  ac.abort()
})

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down...')
  ac.abort()
})

// Start server
console.log(`Starting server on ${hostname}:${port}`)
await router.serve(port, hostname, ac.signal)
```

## Testing Your Configuration

### Test Basic Server

```bash
# Start server
deno run --allow-net main.ts

# Test endpoint
curl http://localhost:8000
```

### Test Hostname Binding

```bash
# Bind to localhost only
deno run --allow-net main.ts

# Should work
curl http://127.0.0.1:8000

# Should fail (if binding to 127.0.0.1 only)
curl http://0.0.0.0:8000
```

### Test Graceful Shutdown

```bash
# Start server
deno run --allow-net main.ts

# Send SIGINT (Ctrl+C)
# Server should shutdown gracefully
```

## Next Steps

Now that you know how to configure your server:

- [Custom Configuration](/getting-started/custom-configuration) - Configure router options
- [Middleware](/middleware/global) - Add request processing
- [Error Handling](/error-handling/object-details) - Handle errors gracefully
