# Konfigurasi Server

> **Referensi**: [Deno.serve API Documentation](https://docs.deno.com/api/deno/~/Deno.serve)

Konfigurasi server Deserve Anda dengan hostname binding dan graceful shutdown.

## Setup Server Dasar

Cara paling sederhana untuk memulai server:

```typescript
// 1. Import Router
import { Router } from '@neabyte/deserve'

// 2. Buat router
const router = new Router()

// 3. Jalankan server di port 8000 (bind 0.0.0.0)
await router.serve(8000)
```

Ini memulai server Anda di `0.0.0.0:8000` (semua interface).

## Method Serve Yang Diperluas

Method `serve` Deserve yang diperluas mendukung tiga parameter:

```typescript
// Method signatures
async serve(port: number): Promise<void>
async serve(port: number, hostname?: string): Promise<void>
async serve(port: number, hostname?: string, signal?: AbortSignal): Promise<void>
```

## Hostname Binding

### Bind Ke Interface Spesifik

```typescript
// 1. Localhost saja (development)
await router.serve(8000, '127.0.0.1')

// 2. Semua interface (default)
await router.serve(8000, '0.0.0.0')

// 3. IP spesifik
await router.serve(8000, '192.168.1.100')
```

### Development Vs Production

```typescript
// 1. Development: hanya localhost
await router.serve(8000, '127.0.0.1')

// 2. Production: listen di semua interface
await router.serve(8000, '0.0.0.0')
```

## Graceful Shutdown

Gunakan `AbortSignal` untuk graceful server shutdown:

```typescript
// 1. Buat router dan AbortController
import { Router } from '@neabyte/deserve'

const router = new Router()
const ac = new AbortController()

// 2. Serve dengan signal; panggil ac.abort() untuk shutdown
await router.serve(8000, '127.0.0.1', ac.signal)

ac.abort()
```

### Penanganan Sinyal Process

```typescript
// 1. Buat router dan AbortController
import { Router } from '@neabyte/deserve'

const router = new Router()
const ac = new AbortController()

// 2. Daftarkan signal handlers
Deno.addSignalListener('SIGINT', async () => {
  ac.abort()
  Deno.exit(0)
})
Deno.addSignalListener('SIGTERM', async () => {
  ac.abort()
  Deno.exit(0)
})

// 3. Jalankan server dengan signal; panggil ac.abort() untuk shutdown
await router.serve(8000, '127.0.0.1', ac.signal)
```

## Pengujian Konfigurasi

### Uji Server Dasar

```bash
# Start server
deno run --allow-net --allow-read main.ts

# Test endpoint
curl http://localhost:8000
```

### Uji Hostname Binding

```bash
# Bind ke localhost saja
deno run --allow-net --allow-read main.ts

# Seharusnya bekerja
curl http://127.0.0.1:8000

# Seharusnya gagal (jika binding ke 127.0.0.1 saja)
curl http://0.0.0.0:8000
```

### Uji Graceful Shutdown

```bash
# Start server
deno run --allow-net --allow-read main.ts

# Kirim SIGINT (Ctrl+C)
# Server seharusnya shutdown dengan graceful
```
