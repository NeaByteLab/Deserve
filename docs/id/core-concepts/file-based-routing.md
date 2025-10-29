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

### 1. Nama File Menjadi Routes
- `index.ts`, `index.js`, `index.mjs` → `/` (root)
- `about.ts`, `about.js`, `about.mjs` → `/about`
- `users.ts`, `users.js`, `users.cjs` → `/users`

Semua ekstensi yang didukung (`.ts`, `.js`, `.tsx`, `.jsx`, `.mjs`, `.cjs`) bekerja identik.

### 2. Folder Membuat Nested Routes
- `users/[id].ts` → `/users/:id`
- `users/[id]/posts.ts` → `/users/:id/posts`

### 3. Parameter Dinamis Menggunakan Sintaks `[param]`
- `[id].ts` → parameter `:id`
- `[userId].ts` → parameter `:userId`
- `[postId].ts` → parameter `:postId`

### 4. HTTP Methods Adalah Fungsi yang Diekspor

```typescript
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  return ctx.send.json({ users: [] })
}

export async function POST(ctx: Context): Promise<Response> {
  const data = await ctx.body()
  return ctx.send.json({ message: 'User created', data })
}

// export function [method](ctx: Context): Response {
// ... code here ...
// }
```

### 5. URL Case-Sensitive

URL bersifat case-sensitive sesuai standar HTTP:

- `/Users/John` ≠ `/users/john`
- `/API/v1` ≠ `/api/v1`

### 6. Karakter Nama File yang Valid

File dapat berisi aturan spesifik:

- `a-z`, `A-Z`, `0-9` - Karakter alfanumerik
- `_` - Underscore
- `-` - Dash
- `.` - Dot
- `~` - Tilde
- `+` - Tanda plus
- `[` `]` - Bracket untuk parameter dinamis

