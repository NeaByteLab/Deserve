---
description: "Cara Deserve memetakan struktur direktori routes ke endpoint HTTP memakai routing berbasis file."
---

# Routing Berbasis File

> **Referensi**: [Tutorial File-based Routing Deno](https://docs.deno.com/examples/file_based_routing_tutorial/)

Routing berbasis file adalah konsep inti Deserve, di mana struktur sistem berkas otomatis menjadi struktur API, mengikuti pola yang sama seperti [Next.js](https://nextjs.org/) tapi untuk API Deno.

## Cara Kerja

Deserve memindai direktori routes dan membuat endpoint dari struktur berkas, dan setiap ekstensi yang didukung (`.ts`, `.js`, `.tsx`, `.jsx`, `.mjs`, `.cjs`) bekerja dengan cara yang sama:

```
routes/
├── index.ts               → GET /
├── about.mjs              → GET /about
├── users.js               → GET /users
├── users/[id].ts          → GET /users/:id
└── users/[id]/
    └── posts/
        └── [postId].jsx   → GET /users/:id/posts/:postId
```

## Aturan Inti

### 1. Nama Berkas Menjadi Rute

- `index.ts`, `index.js`, `index.mjs` → `/` (root)
- `about.ts`, `about.js`, `about.mjs` → `/about`
- `users.ts`, `users.js`, `users.cjs` → `/users`

Semua ekstensi yang didukung (`.ts`, `.js`, `.tsx`, `.jsx`, `.mjs`, `.cjs`) bekerja identik. Nama berkas hanya boleh punya satu titik yang memisahkan nama dari ekstensi, jadi `about.ts` termuat tapi `about.config.ts` tidak.

### 2. Folder Membuat Rute Bersarang

- `users/[id].ts` → `/users/:id`
- `users/[id]/posts.ts` → `/users/:id/posts`

### 3. Parameter Dinamis Memakai Sintaks `[param]`

- `[id].ts` → parameter `:id`
- `[userId].ts` → parameter `:userId`
- `[postId].ts` → parameter `:postId`

Segmen dinamis dicocokkan oleh [Pola Rute](/id/core-concepts/route-patterns) dan dibaca dengan `ctx.get.param()` dari [Penanganan Request](/id/core-concepts/request-handling#parameter-rute).

### 4. Metode HTTP Adalah Fungsi yang Diekspor

```typescript twoslash
import type { Context } from '@neabyte/deserve'

// Tiap export memetakan ke metodenya
export function GET(ctx: Context): Response {
  return ctx.send.json({
    users: []
  })
}

export async function POST(ctx: Context): Promise<Response> {
  // Baca body request yang sudah diparsing
  const data = await ctx.get.body()
  return ctx.send.json({
    message: 'User created',
    data
  })
}

// PUT, PATCH, DELETE ikut bentuk yang sama
// export function [method](ctx: Context): Response { ... }
```

Berkas rute wajib mengekspor minimal satu metode HTTP (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`). Berkas yang namanya tidak pernah membentuk pola yang bisa dimuat, misalnya diawali `_`, dilewati saat pemindaian dan memancarkan event [`route:ignored`](/id/middleware/observability/events#rute). Berkas dengan nama yang bisa dimuat tapi tanpa metode terekspor adalah kesalahan yang layak ditangkap sejak awal, jadi pemindaian melempar `Deno.errors.InvalidData` saat startup, dan export yang bukan fungsi melempar `TypeError`.

### 5. URL Membedakan Huruf Besar dan Kecil

URL membedakan huruf besar dan kecil mengikuti standar HTTP:

- `/Users/John` ≠ `/users/john`
- `/API/v1` ≠ `/api/v1`

### 6. Karakter Nama Berkas yang Valid

Segmen terakhir dari path rute (nama berkas tanpa ekstensi) boleh memakai karakter berikut:

- `a-z`, `A-Z`, `0-9` - Karakter alfanumerik
- `_` - Garis bawah (jangan jadi awalan segmen - lihat di bawah)
- `-` - Strip
- `~` - Tilde
- `+` - Tanda plus
- `[` `]` - Kurung siku untuk parameter dinamis

**Segmen yang dilewati:** Folder atau nama berkas yang **diawali** `_` atau `@` tidak didaftarkan sebagai rute (misalnya `_layout.ts`, `@middleware.ts`, folder `_components/`). Berguna untuk berkas pendukung yang bukan endpoint.

Berkas rute yang diedit dimuat ulang seketika tanpa restart, dibahas di [Hot Reload](/id/core-concepts/hot-reload).
