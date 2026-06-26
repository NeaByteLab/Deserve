---
description: "Middleware session berbasis cookie yang ditandatangani dengan HMAC-SHA256 untuk state per-user."
---

# Middleware Session

Middleware session menyimpan data session di cookie yang ditandatangani dan mengeksposnya lewat context, cocok untuk login, preferensi, atau state per-user tanpa database session. Payload cookie ditandatangani dengan HMAC-SHA256, dan **`secret` wajib serta minimal 32 karakter**.

## Penggunaan Dasar

`Mware.session({ secret })` menambahkan session berbasis cookie:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()

// Secret menandatangani cookie session
router.use(
  Mware.session({
    secret: Deno.env.get('SESSION_SECRET') ?? 'replace-with-secret-min-32-chars'
  })
)

await router.serve(8000)
```

Middleware memasang session controller di context, jadi handler membaca dan menulis data session lewat `ctx.get.session()` dan `ctx.set.session()`:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// Baca data session saat ini
const session = ctx.get.session()

// Simpan data session (async)
await ctx.set.session({ userId: '1' })

// Hapus session
await ctx.set.session(null)
```

`ctx.get.session()` mengembalikan objek data session atau `null` ketika tidak ada session. `ctx.set.session(data)` menandatangani data ke dalam cookie, dan `ctx.set.session(null)` menghapusnya.

## Contoh: Login Dan Logout

```typescript twoslash
import type { Context } from '@neabyte/deserve'

// POST: login, set session saat kredensial valid
export async function POST(ctx: Context): Promise<Response> {
  // Baca body JSON yang sudah diparsing
  const body = await ctx.get.json() as { username?: string; password?: string }
  // Simpan session saat kredensial cocok
  if (body?.username === 'admin' && body?.password === 'secret') {
    await ctx.set.session({
      userId: '1',
      username: 'admin'
    })
    return ctx.send.json({ ok: true })
  }
  return ctx.send.json(
    { error: 'Invalid credentials' },
    { status: 401 }
  )
}

// GET: cek status login
export function GET(ctx: Context): Response {
  // Baca session dari context
  const session = ctx.get.session()
  if (!session) {
    return ctx.send.json({ loggedIn: false })
  }
  return ctx.send.json({
    loggedIn: true,
    user: session
  })
}

// DELETE: logout, hapus session
export async function DELETE(ctx: Context): Promise<Response> {
  // Buang cookie session
  await ctx.set.session(null)
  return ctx.send.json({ ok: true })
}
```

## Opsi Session

**`secret`** wajib, minimal 32 karakter, dan menandatangani cookie dengan HMAC-SHA256. Nama cookie, max age, path, dan atribut keamanan juga bisa dikonfigurasi:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Timpa pengaturan cookie default
router.use(
  Mware.session({
    secret: Deno.env.get('SESSION_SECRET') ?? 'fallback-secret-at-least-32-characters',
    name: 'sid',
    maxAge: 3600,
    path: '/',
    sameSite: 'Lax',
    httpOnly: true,
    secure: false
  })
)
```

| Opsi       | Default     | Keterangan                                          |
| ---------- | ----------- | --------------------------------------------------- |
| `secret`   | -           | **Wajib, min 32 karakter.** Menandatangani cookie.  |
| `name`     | `'session'` | Nama cookie                                         |
| `maxAge`   | `86400`     | Umur cookie dalam detik (24 jam)                   |
| `path`     | `'/'`       | Path cookie                                        |
| `sameSite` | `'Lax'`     | `'Strict' \| 'Lax' \| 'None'`                      |
| `httpOnly` | `true`      | Cookie tidak diakses dari JavaScript               |
| `secure`   | `false`     | Wajibkan HTTPS untuk cookie                        |

### Validasi dan Kedaluwarsa

Middleware memeriksa opsinya saat dibuat dan melempar `Deno.errors.InvalidData` saat ada yang tidak aman:

- `secret` lebih pendek dari 32 karakter
- `sameSite: 'None'` tanpa `secure: true`, karena browser menolak kombinasi itu
- `maxAge` yang bukan angka bulat positif

Setiap cookie juga membawa waktu terbit bertanda tangan, jadi middleware memperlakukan session yang lebih tua dari `maxAge` sebagai tidak ada dan membacanya kembali sebagai `null`. Cookie yang dirusak gagal pemeriksaan signature dan dibaca sebagai `null` juga, sehingga session basi atau palsu tidak dipercaya. Setiap kali cookie gagal didekode, middleware memancarkan event [`session:invalid`](/id/middleware/observability/events) yang menyebut cookie dan apakah nilainya dirusak, kedaluwarsa, atau malformed, sementara request lanjut tanpa session terpasang.

## Batasan

- Data session ada di cookie dan ditandatangani dengan HMAC-SHA256, jadi sebaiknya hanya menyimpan identifier atau data kecil daripada nilai besar atau sangat sensitif
- Session sisi server atau berbasis token butuh mekanisme lain seperti JWT atau Redis di luar middleware ini
