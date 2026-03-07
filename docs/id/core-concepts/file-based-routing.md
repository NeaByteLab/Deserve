# Routing Berbasis File

> **Referensi**: [Deno File-based Routing Tutorial](https://docs.deno.com/examples/file_based_routing_tutorial/)

Routing berbasis file adalah konsep inti Deserve - struktur sistem file Anda menjadi struktur API secara otomatis, mengikuti pola yang sama seperti [Next.js](https://nextjs.org/) tapi untuk API Deno.

## Cara Kerja

Deserve memindai direktori routes Anda dan membuat endpoint dari struktur file. Semua ekstensi yang didukung (`.ts`, `.js`, `.tsx`, `.jsx`, `.mjs`, `.cjs`) bekerja dengan cara yang sama:

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

### 1. Nama File Menjadi Rute

- `index.ts`, `index.js`, `index.mjs` → `/` (root)
- `about.ts`, `about.js`, `about.mjs` → `/about`
- `users.ts`, `users.js`, `users.cjs` → `/users`

Semua ekstensi yang didukung (`.ts`, `.js`, `.tsx`, `.jsx`, `.mjs`, `.cjs`) bekerja identik.

### 2. Folder Membuat Rute Bersarang

- `users/[id].ts` → `/users/:id`
- `users/[id]/posts.ts` → `/users/:id/posts`

### 3. Parameter Dinamis Menggunakan Sintaks `[param]`

- `[id].ts` → parameter `:id`
- `[userId].ts` → parameter `:userId`
- `[postId].ts` → parameter `:postId`

### 4. HTTP Methods Adalah Fungsi Yang Diekspor

```typescript
// 1. Import tipe Context
import type { Context } from '@neabyte/deserve'

// 2. Export GET → route GET /; POST → POST /
export function GET(ctx: Context): Response {
  return ctx.send.json({ users: [] })
}

export async function POST(ctx: Context): Promise<Response> {
  const data = await ctx.body()
  return ctx.send.json({ message: 'User created', data })
}

// 3. Method lain: PUT, PATCH, DELETE, dll. — export dengan nama yang sama
// export function [method](ctx: Context): Response { ... }
```

### 5. URL Case-Sensitive (Huruf Besar/Kecil Diperhitungkan)

URL bersifat case-sensitive sesuai standar HTTP:

- `/Users/John` ≠ `/users/john`
- `/API/v1` ≠ `/api/v1`

### 6. Karakter Nama File Yang Valid

File dapat berisi aturan spesifik:

- `a-z`, `A-Z`, `0-9` - Karakter alfanumerik
- `_` - Underscore (jangan awali segmen path — lihat bawah)
- `-` - Dash
- `.` - Dot
- `~` - Tilde
- `+` - Tanda plus
- `[` `]` - Bracket untuk parameter dinamis

**Segmen yang di-skip:** Folder atau nama file yang **diawali** `_` atau `@` tidak didaftar sebagai route (mis. `_layout.ts`, `@middleware.ts`, folder `_components/`). Berguna untuk file pendukung yang bukan endpoint.
