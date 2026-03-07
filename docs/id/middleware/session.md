# Middleware Session

Middleware Session menyimpan data session di cookie dan mengeksposnya lewat `ctx.state`, cocok untuk login, preferensi, atau state per-user tanpa database session.

## Penggunaan Dasar

Gunakan `Mware.session()` untuk menambahkan session berbasis cookie:

```typescript
// 1. Import Router dan Mware
import { Router, Mware } from '@neabyte/deserve'

// 2. Buat router
const router = new Router()

// 3. Pasang middleware session (cookie-based)
router.use(Mware.session())

// 4. Jalankan server
await router.serve(8000)
```

Setelah itu, di route handler atau middleware:

- **`ctx.state.session`** - Data session (object atau `null` jika belum ada)
- **`ctx.state.setSession(data)`** - Menyimpan data ke session (mengatur cookie)
- **`ctx.state.clearSession()`** - Menghapus session (clear cookie)

## Contoh: Login Dan Logout

```typescript
import type { Context } from '@neabyte/deserve'

// POST: login — set session jika kredensial benar
export async function POST(ctx: Context): Promise<Response> {
  // 1. Baca body JSON (username, password)
  const body = await ctx.json()
  // 2. Cek kredensial; jika valid, simpan ke session
  if (body?.username === 'admin' && body?.password === 'secret') {
    ctx.state.setSession({ userId: '1', username: 'admin' })
    return ctx.send.json({ ok: true })
  }
  // 3. Salah → 401
  return ctx.send.json({ error: 'Invalid credentials' }, { status: 401 })
}

// GET: cek status login
export function GET(ctx: Context): Response {
  // 1. Baca session dari ctx.state (diisi middleware)
  const session = ctx.state.session
  if (!session) {
    return ctx.send.json({ loggedIn: false })
  }
  // 2. Ada session → kirim data user
  return ctx.send.json({ loggedIn: true, user: session })
}

// DELETE: logout — hapus session
export function DELETE(ctx: Context): Response {
  // 1. Clear cookie session
  ctx.state.clearSession()
  return ctx.send.json({ ok: true })
}
```

## Opsi Session

Anda bisa mengubah nama cookie, umur, path, dan atribut keamanan:

```typescript
// 1. Pasang session dengan opsi kustom
router.use(
  Mware.session({
    cookieName: 'sid', // nama cookie
    maxAge: 3600, // 1 jam (detik)
    path: '/',
    sameSite: 'Lax',
    httpOnly: true
  })
)
```

| Opsi         | Default     | Keterangan                           |
| ------------ | ----------- | ------------------------------------ |
| `cookieName` | `'session'` | Nama cookie                          |
| `maxAge`     | `86400`     | Umur cookie dalam detik (24 jam)     |
| `path`       | `'/'`       | Path cookie                          |
| `sameSite`   | `'Lax'`     | `'Strict' \| 'Lax' \| 'None'`        |
| `httpOnly`   | `true`      | Cookie tidak diakses dari JavaScript |

## Batasan

- Data session disimpan di cookie (base64 + JSON). Jangan simpan data sensitif besar; gunakan hanya untuk identifier atau data kecil.
- Untuk session server-side atau token-based, gunakan mekanisme lain (JWT, Redis, dll.) di luar middleware ini.
