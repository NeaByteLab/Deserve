# Mulai Cepat

Mulai menggunakan Deserve dalam kurang dari 5 menit!

## Struktur Proyek

Di akhir panduan ini, Anda akan memiliki struktur proyek berikut. Buat folder dan file sesuai urutan langkah di bawah:

```
.
├── main.ts
└── routes/
    └── index.ts
```

## 1. Buat Server Anda

Buat `main.ts`:

```typescript
// 1. Import Router
import { Router } from '@neabyte/deserve'

// 2. Buat instance router (pakai default routesDir: ./routes)
const router = new Router()

// 3. Jalankan server di port 8000
await router.serve(8000)
```

## 2. Buat Route Pertama Anda

Buat folder `routes` dan tambahkan `index.ts`:

```typescript
// 1. Import tipe Context
import type { Context } from '@neabyte/deserve'

// 2. Export handler dengan nama method HTTP (GET) — file-based routing
export function GET(ctx: Context): Response {
  // 3. Kirim JSON response
  return ctx.send.json({
    message: 'Hello from Deserve!',
    timestamp: new Date().toISOString()
  })
}
```

## 3. Jalankan Server Anda

```bash
deno run --allow-net --allow-read main.ts
```

## 4. Uji API Anda

```bash
curl http://localhost:8000
```

Anda seharusnya melihat:

```json
{
  "message": "Hello from Deserve!",
  "timestamp": "2077-01-01T00:00:00.000Z"
}
```
