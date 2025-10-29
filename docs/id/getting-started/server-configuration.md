# Konfigurasi Server

> **Referensi**: [Deno.serve API Documentation](https://docs.deno.com/api/deno/~/Deno.serve)

Konfigurasi server Deserve Anda dengan hostname binding dan graceful shutdown.

## Setup Server Dasar

Cara paling sederhana untuk memulai server:

```typescript
import { Router } from '@neabyte/deserve'

const router = new Router()

await router.serve(8000)
```

Ini memulai server Anda di `0.0.0.0:8000` (semua interface).

## Method Serve yang Diperluas

Method `serve` Deserve yang diperluas mendukung tiga parameter:

```typescript
// Method signatures
async serve(port: number): Promise<void>
async serve(port: number, hostname?: string): Promise<void>
async serve(port: number, hostname?: string, signal?: AbortSignal): Promise<void>
```

## Hostname Binding

### Bind ke Interface Spesifik

```typescript
// Bind ke localhost saja
await router.serve(8000, '127.0.0.1')

// Bind ke semua interface (default)
await router.serve(8000, '0.0.0.0')

// Bind ke network interface spesifik
await router.serve(8000, '192.168.1.100')
```

### Development vs Production

```typescript
// Development - localhost saja
await router.serve(8000, '127.0.0.1')

// Production - semua interface
await router.serve(8000, '0.0.0.0')
```

## Graceful Shutdown

Gunakan `AbortSignal` untuk graceful server shutdown:

```typescript
import { Router } from '@neabyte/deserve'

const router = new Router()
const ac = new AbortController()

await router.serve(8000, '127.0.0.1', ac.signal)

ac.abort()
```

### Penanganan Process Signal

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
# Bind ke localhost saja
deno run --allow-net --allow-read main.ts

# Seharusnya bekerja
curl http://127.0.0.1:8000

# Seharusnya gagal (jika binding ke 127.0.0.1 saja)
curl http://0.0.0.0:8000
```

### Test Graceful Shutdown

```bash
# Start server
deno run --allow-net --allow-read main.ts

# Kirim SIGINT (Ctrl+C)
# Server seharusnya shutdown dengan graceful
```

