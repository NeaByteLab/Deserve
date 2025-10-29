# Penanganan Request

> **Referensi**: [Deno Request API Documentation](https://docs.deno.com/deploy/classic/api/runtime-request/)

Deserve menyediakan objek `Context` yang membungkus `Request` native dengan method untuk mengakses query parameter, route parameter, header, cookie, dan data body.

## Penggunaan Dasar

Import tipe `Context` dan gunakan di route handler Anda:

```typescript
import type { Context } from '@neabyte/deserve'

export function GET(ctx: Context): Response {
  const query = ctx.query()
  return ctx.send.json({ query })
}
```

## Query Parameters

Akses URL query parameters dengan parsing otomatis:

### Query Parameter Tunggal
```typescript
// URL: /search?q=deno&limit=10
export function GET(ctx: Context): Response {
  const query = ctx.query() // { q: 'deno', limit: '10' }
  return ctx.send.json({
    search: query.q,
    limit: parseInt(query.limit || '10')
  })
}
```

**Penting:** Ketika ada kunci duplikat di URL, `query()` mengembalikan **nilai terakhir**:

```typescript
// URL: /search?tag=deno&tag=typescript
const query = ctx.query() // { tag: 'typescript' } ← mengembalikan nilai terakhir
```

### Beberapa Nilai untuk Kunci yang Sama

Gunakan `queries()` ketika Anda membutuhkan **semua nilai** untuk kunci spesifik:

```typescript
// URL: /search?tags=deno&tags=typescript&tags=javascript
export function GET(ctx: Context): Response {
  const tags = ctx.queries('tags') // ['deno', 'typescript', 'javascript']
  return ctx.send.json({ tags })
}
```

**Use cases:**
- **`query()`** - Ambil nilai tunggal atau nilai terakhir saat ada duplikat
- **`queries()`** - Ambil semua nilai untuk array/multi-select parameter

### Objek Query Lengkap
```typescript
// URL: /api/users?page=1&limit=20&sort=name&order=asc
export function GET(ctx: Context): Response {
  const query = ctx.query() // { page: '1', limit: '20', sort: 'name', order: 'asc' }
  return ctx.send.json({
    page: parseInt(query.page || '1'),
    limit: parseInt(query.limit || '10'),
    sort: query.sort || 'id',
    order: query.order || 'asc'
  })
}
```

## Route Parameters

Akses dynamic route parameters dari file-based routing:

### Parameter Tunggal
```typescript
// routes/users/[id].ts
// URL: /users/123
export function GET(ctx: Context): Response {
  const id = ctx.param('id') // '123'
  return ctx.send.json({ userId: id })
}
```

### Parameter Ganda
```typescript
// routes/users/[id]/posts/[postId].ts
// URL: /users/123/posts/456
export function GET(ctx: Context): Response {
  const id = ctx.param('id')
  const postId = ctx.param('postId') // id='123', postId='456'
  return ctx.send.json({ userId: id, postId })
}
```

### Semua Parameter
```typescript
// routes/api/v1/users/[userId]/posts/[postId]/comments/[commentId].ts
// URL: /api/v1/users/123/posts/456/comments/789
export function GET(ctx: Context): Response {
  const params = ctx.params() // { userId: '123', postId: '456', commentId: '789' }
  return ctx.send.json(params)
}
```

## Referensi Method

#### `ctx.query(key?)`
Mengembalikan semua query parameters sebagai objek. **Mengembalikan nilai terakhir untuk kunci duplikat.**

```typescript
// URL: /search?q=deno&limit=10
const query = ctx.query() // { q: 'deno', limit: '10' }

// URL: /search?tag=deno&tag=typescript
const query = ctx.query() // { tag: 'typescript' } ← hanya nilai terakhir

// Parameter tunggal
const q = ctx.query('q') // Mengembalikan: 'deno'
```

#### `ctx.queries(key)`
Mengembalikan **semua nilai** untuk kunci query parameter spesifik sebagai array.

```typescript
// URL: /search?tags=deno&tags=typescript
const tags = ctx.queries('tags') // ['deno', 'typescript'] ← semua nilai

// Kapan menggunakan:
// - query() untuk nilai tunggal atau saat Anda hanya membutuhkan nilai terakhir
// - queries() saat Anda membutuhkan semua nilai untuk array/multi-select
```

#### `ctx.param(key)`
Mengembalikan nilai route parameter tunggal.

```typescript
// Route: /users/[id]
// URL: /users/123
const id = ctx.param('id') // '123'
```

#### `ctx.params()`
Mengembalikan semua route parameters sebagai objek.

```typescript
// Route: /users/[id]/posts/[postId]
// URL: /users/123/posts/456
const params = ctx.params() // { id: '123', postId: '456' }
```

#### `ctx.body()`
Parse request body secara otomatis (JSON, form-data, atau text).

```typescript
// POST /api/users dengan JSON body
export async function POST(ctx: Context): Promise<Response> {
  const body = await ctx.body() // { name: 'John', age: 30 }
  return ctx.send.json({ created: body })
}
```

#### `ctx.json()`
Parse request body sebagai JSON.

```typescript
// POST /api/users dengan JSON body
export async function POST(ctx: Context): Promise<Response> {
  const body = await ctx.json() // { name: 'John', age: 30 }
  return ctx.send.json({ created: body })
}
```

#### `ctx.formData()`
Parse request body sebagai form data. Mengembalikan objek `FormData`.

```typescript
// POST /api/users dengan form data
export async function POST(ctx: Context): Promise<Response> {
  const formData = await ctx.formData() // Objek FormData
  const name = formData.get('name') // 'John'
  return ctx.send.json({ name })
}
```

#### `ctx.text()`
Ambil request body sebagai text mentah.

```typescript
// POST /api/text dengan plain text
export async function POST(ctx: Context): Promise<Response> {
  const text = await ctx.text() // 'Hello World'
  return ctx.send.text(text)
}
```

#### `ctx.arrayBuffer()`
Baca request body sebagai ArrayBuffer. Berguna untuk pemrosesan data biner.

```typescript
// POST /api/upload dengan data biner
export async function POST(ctx: Context): Promise<Response> {
  const buffer = await ctx.arrayBuffer() // Objek ArrayBuffer
  // Proses data biner...
  return ctx.send.json({ size: buffer.byteLength })
}
```

#### `ctx.blob()`
Baca request body sebagai Blob. Berguna untuk upload file dan penanganan data biner.

```typescript
// POST /api/upload dengan data file
export async function POST(ctx: Context): Promise<Response> {
  const blob = await ctx.blob() // Objek Blob
  // Proses data file...
  return ctx.send.json({
    type: blob.type,
    size: blob.size
  })
}
```

#### `ctx.header(key?)`
Ambil nilai header berdasarkan kunci atau semua header (case-insensitive).

```typescript
// Ambil header spesifik
const contentType = ctx.header('content-type')

// Ambil semua header sebagai objek
const headers = ctx.header()

// Catatan: Semua header di-lowercase
```

#### `ctx.headers`
Ambil objek Headers mentah untuk akses langsung.

```typescript
// Akses raw Headers API
const contentType = ctx.headers.get('Content-Type')
```

#### `ctx.cookie(key?)`
Ambil nilai cookie berdasarkan kunci atau semua cookies.

```typescript
// Ambil cookie spesifik
const sessionId = ctx.cookie('sessionId')

// Ambil semua cookies
const cookies = ctx.cookie() // { sessionId: 'abc123', theme: 'dark' }
```

