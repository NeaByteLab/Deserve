# Pola Rute

> **Referensi**: [Fast Router GitHub Repository](https://github.com/NeaByteLab/Fast-Router)

Deserve menggunakan **Fast Router** - router berbasis radix tree berperforma tinggi untuk pencocokan rute dan ekstraksi parameter yang cepat.

## Pencocokan Pola

Deserve mengonversi path file menjadi pola rute. **FastRouter** menangani pencocokan pola dengan radix tree untuk performa optimal:

```
.
├── routes/index.ts              → /
├── routes/about.ts              → /about
├── routes/users/[id].ts         → /users/:id
├── routes/users/[id]/posts.ts   → /users/:id/posts
```

## Parameter Dinamis

Gunakan sintaks `[param]` untuk segmen rute dinamis:

### Parameter Tunggal
```typescript
// File: routes/users/[id].ts
import type { Context } from '@neabyte/deserve'

// GET /users/:id
export function GET(ctx: Context): Response {
  const id = ctx.param('id')
  return ctx.send.json({ userId: id })
}
```

### Parameter Ganda
```typescript
// File: routes/users/[id]/posts/[postId].ts
import type { Context } from '@neabyte/deserve'

// GET /users/:id/posts/:postId
export function GET(ctx: Context): Response {
  const id = ctx.param('id')
  const postId = ctx.param('postId')
  return ctx.send.json({ userId: id, postId })
}
```

### Parameter Bersarang
```typescript
// File: routes/api/v1/users/[userId]/posts/[postId]/comments/[commentId].ts
import type { Context } from '@neabyte/deserve'

// GET /api/v1/users/:userId/posts/:postId/comments/:commentId
export function GET(ctx: Context): Response {
  const userId = ctx.param('userId')
  const postId = ctx.param('postId')
  const commentId = ctx.param('commentId')
  return ctx.send.json({ userId, postId, commentId })
}
```

## Contoh Pola

### Manajemen Pengguna
```
routes/
├── users.ts                       → /users
├── users/[id].ts                  → /users/:id
├── users/[id]/profile.ts          → /users/:id/profile
├── users/[id]/posts.ts            → /users/:id/posts
└── users/[id]/posts/[postId].ts   → /users/:id/posts/:postId
```

### API Versioning
```
routes/
├── api/
│   ├── v1/
│   │   └── users/[id].ts          → /api/v1/users/:id
│   └── v2/
│       └── users/[id].ts          → /api/v2/users/:id
```

### Sistem Blog
```
routes/
├── blog/
│   ├── [slug].ts                  → /blog/:slug
│   └── [year]/
│       └── [month]/
│           └── [day]/
│               └── [slug].ts      → /blog/:year/:month/:day/:slug
```

## Validasi Parameter

Ekstrak dan validasi parameter di route handler Anda:

```typescript
// File: routes/users/[id].ts
import type { Context } from '@neabyte/deserve'

// GET /users/:id
export function GET(ctx: Context): Response {
  const id = ctx.param('id')
  if (!id || !/^\d+$/.test(id)) {
    return ctx.send.json({ error: 'Invalid user ID' }, { status: 400 })
  }
  return ctx.send.json({ userId: parseInt(id) })
}
```

