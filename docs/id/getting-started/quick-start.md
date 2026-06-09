---
description: "Bangun server HTTP dan rute Deserve pertama dalam kurang dari lima menit."
---

# Mulai Cepat

Jalankan server Deserve dalam kurang dari 5 menit.

## Struktur Proyek

Panduan ini berakhir dengan struktur proyek berikut:

```
.
├── main.ts
└── routes/
    └── index.ts
```

## 1. Buat Server

Buat `main.ts`:

```typescript twoslash
import { Router } from '@neabyte/deserve'

// Router default routesDir ke ./routes
const router = new Router()

// Dengarkan di port 8000
await router.serve(8000)
```

## 2. Buat Rute Pertama

Buat folder `routes` dan tambahkan `index.ts`:

```typescript twoslash
import type { Context } from '@neabyte/deserve'

// Handler GET memetakan ke rute ini
export function GET(ctx: Context): Response {
  // Balas dengan body JSON
  return ctx.send.json({
    message: 'Hello from Deserve!',
    timestamp: new Date().toISOString()
  })
}
```

## 3. Jalankan Server

```bash
deno run --allow-net --allow-read main.ts
```

## 4. Uji API

```bash
curl http://localhost:8000
```

Response-nya terlihat seperti ini:

```json
{
  "message": "Hello from Deserve!",
  "timestamp": "2077-01-01T00:00:00.000Z"
}
```
