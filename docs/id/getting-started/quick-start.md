# Mulai Cepat

Mulai menggunakan Deserve dalam kurang dari 5 menit!

## Struktur Proyek

Di akhir panduan ini, Anda akan memiliki struktur proyek ini:

```
.
├── main.ts
└── routes/
    └── index.ts
```

## 1. Buat Server Anda

Buat `main.ts`:

```typescript
import { Router } from '@neabyte/deserve'

const router = new Router()

await router.serve(8000)
```

## 2. Buat Route Pertama Anda

Buat folder `routes` dan tambahkan `index.ts`:

```typescript
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
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

