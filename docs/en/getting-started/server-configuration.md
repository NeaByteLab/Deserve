# Server Configuration

> **Reference**: [Deno.serve API Documentation](https://docs.deno.com/api/deno/~/Deno.serve)

Configure your Deserve server with hostname binding and graceful shutdown.

## Basic Server Setup

The simplest way to start a server:

```typescript
import { Router } from '@neabyte/deserve'

const router = new Router()

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

await router.serve(8000, '127.0.0.1', ac.signal)

ac.abort()
```

### Process Signal Handling

```typescript
import { Router } from '@neabyte/deserve'

const router = new Router()
const ac = new AbortController()

// Handle SIGINT (Ctrl+C)
Deno.addSignalListener('SIGINT', async () => {
  ac.abort()
  Deno.exit(0)
})

// Handle SIGTERM (Kill Signal)
Deno.addSignalListener('SIGTERM', async () => {
  ac.abort()
  Deno.exit(0)
})

await router.serve(8000, '127.0.0.1', ac.signal)
```

## Testing Configuration

### Test Basic Server

```bash
# Start server
deno run --allow-net --allow-read main.ts

# Test endpoint
curl http://localhost:8000
```

### Test Hostname Binding

```bash
# Bind to localhost only
deno run --allow-net --allow-read main.ts

# Should work
curl http://127.0.0.1:8000

# Should fail (if binding to 127.0.0.1 only)
curl http://0.0.0.0:8000
```

### Test Graceful Shutdown

```bash
# Start server
deno run --allow-net --allow-read main.ts

# Send SIGINT (Ctrl+C)
# Server should shutdown gracefully
```
