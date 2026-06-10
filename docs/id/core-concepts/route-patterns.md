---
description: "Sintaks pola rute di Deserve termasuk parameter dinamis, wildcard, dan aturan pencocokan."
---

# Pola Rute

> **Referensi**: [Repositori GitHub Fast Router](https://github.com/NeaByteLab/Fast-Router)

[Routing Berbasis File](/id/core-concepts/file-based-routing) membahas aturan yang mengubah folder menjadi URL. Halaman ini membahas separuh lainnya, mesin pencocokan yang memutuskan berkas mana yang menjawab request masuk. Deserve memakai **Fast Router** (radix tree) untuk mencocokkan path dan menarik parameter, di mana folder `[param]` menjadi slot `:param` di tingkat router.

## Pencocokan Pola

Deserve mengubah path berkas menjadi pola rute, dan **FastRouter** mencocokkannya dengan radix tree untuk pencarian cepat:

```
.
├── routes/index.ts              → /
├── routes/about.ts              → /about
├── routes/users/[id].ts         → /users/:id
├── routes/users/[id]/posts.ts   → /users/:id/posts
```

## Cara Pencocokan Bekerja

Ketika request tiba, mesin mencari metode dan pathname, lalu menerapkan beberapa aturan tetap:

- **Path persis, metode persis** - handler yang cocok berjalan dengan param-nya terisi
- **HEAD mengikuti GET** - sebuah `HEAD` tanpa handler memakai ulang handler `GET`
- **Metode salah** - path dikenal tanpa handler untuk metode itu mengembalikan **405** dengan header `Allow` yang mendaftar metode yang memang ada
- **Path tidak dikenal** - tanpa kecocokan mengembalikan **404** lewat [error handler](/id/error-handling/object-details)
- **Input terlalu besar** - URL melewati `maxUrlLength` atau param melewati `maxParamLength` mengembalikan **414**, keduanya bisa disetel di [Konfigurasi Server](/id/getting-started/server-configuration)

Param di-percent-decode sekali sebelum handler membacanya, jadi `ctx.param('id')` mengembalikan nilai yang sudah didekode.

## Parameter Dinamis

Folder atau berkas `[param]` menjadi slot bernama `:param` di pola. Tiap kurung di path berubah menjadi satu parameter, dan struktur bersarang tinggal menambah parameter:

| Path berkas                                        | Pola                                       | Param                        |
| -------------------------------------------------- | ------------------------------------------ | ---------------------------- |
| `users/[id].ts`                                    | `/users/:id`                               | `id`                         |
| `users/[id]/posts/[postId].ts`                     | `/users/:id/posts/:postId`                 | `id`, `postId`               |
| `api/v1/users/[userId]/posts/[postId].ts`          | `/api/v1/users/:userId/posts/:postId`      | `userId`, `postId`           |

Nilai yang dicocokkan dibaca di dalam handler dengan `ctx.param()` dan `ctx.params()`, dibahas di [Penanganan Request](/id/core-concepts/request-handling#parameter-rute).

## Contoh Pola

### Manajemen User

```
routes/
├── users.ts                       → /users
├── users/[id].ts                  → /users/:id
├── users/[id]/profile.ts          → /users/:id/profile
├── users/[id]/posts.ts            → /users/:id/posts
└── users/[id]/posts/[postId].ts   → /users/:id/posts/:postId
```

### Versioning API

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

Router mencocokkan bentuk sebuah pola, bukan makna sebuah nilai, jadi `/users/:id` mencocokkan `abc` sama mudahnya dengan `123`. Sebuah handler memvalidasi nilai dan mengembalikan status code yang mengalir ke [error handler](/id/error-handling/object-details):

```typescript twoslash
// File: routes/users/[id].ts
import type { Context } from '@neabyte/deserve'

// Tolak id non-numerik dengan 400
export function GET(ctx: Context): Response {
  const id = ctx.param('id')
  if (!id || !/^\d+$/.test(id)) {
    return ctx.send.json(
      {
        error: 'Invalid user ID'
      },
      {
        status: 400
      }
    )
  }
  return ctx.send.json({
    userId: parseInt(id)
  })
}
```
