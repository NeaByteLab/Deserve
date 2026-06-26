---
description: "Bangun server HTTP dan rute Deserve pertama dalam kurang dari lima menit."
---

# Mulai Cepat

Jalankan server Deserve dalam kurang dari 5 menit. Setiap snippet di sini siap salin-tempel, jadi buka `main.ts` di editor dan ikuti.

## Struktur Proyek

Panduan ini berakhir dengan struktur proyek berikut:

```
.
├── main.ts
└── routes/
    └── index.ts
```

## 1. Buat Server

Buat `main.ts`. `Router` memindai `./routes` secara default, jadi tidak perlu konfigurasi untuk setup dasar:

```typescript twoslash
import { Router } from '@neabyte/deserve'

// Router memindai ./routes secara default
const router = new Router()

// Dengarkan di port 8000
await router.serve(8000)
```

## 2. Buat Rute Pertama

Buat folder `routes` dan tambahkan `index.ts`. Nama fungsi yang diekspor adalah metode HTTP, dan `Context` membawa helper request dan response:

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

Deno butuh izin network dan read untuk server dan berkas rute:

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

## Ke Mana Selanjutnya

- [Instalasi](/id/getting-started/installation) - tambahkan Deserve ke proyek yang sudah ada
- [Konfigurasi Server](/id/getting-started/server-configuration) - hostname binding, shutdown, dan proteksi proses
- [Konfigurasi Routes](/id/getting-started/routes-configuration) - pemuatan rute, batas, dan hook lanjutan
- [Objek Context](/id/core-concepts/context-object) - API request dan response lengkap
- [Routing Berbasis File](/id/core-concepts/file-based-routing) - cara folder memetakan ke URL
