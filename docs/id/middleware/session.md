---
description: "Middleware session berbasis cookie yang ditandatangani dengan HMAC-SHA256 untuk state per-user."
---

# Middleware Session

Middleware session menyimpan data session di cookie yang ditandatangani dan mengeksposnya lewat framework state, cocok untuk login, preferensi, atau state per-user tanpa database session. Payload cookie ditandatangani dengan HMAC-SHA256, dan **`cookieSecret` wajib serta minimal 32 karakter**.

## Penggunaan Dasar

`Mware.session({ cookieSecret })` menambahkan session berbasis cookie:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()

// cookieSecret menandatangani cookie session
router.use(
  Mware.session({
    cookieSecret: Deno.env.get('SESSION_SECRET') ?? 'replace-with-secret-min-32-chars'
  })
)

await router.serve(8000)
```

Middleware menyimpan tiga nilai di framework state, dibaca dengan `ctx.getState`:

- **`session`** - data session, sebuah object atau `null` saat tidak ada atau signature invalid
- **`setSession`** - fungsi async yang menyimpan data dan mengatur cookie bertanda tangan
- **`clearSession`** - fungsi yang menghapus cookie session

```typescript twoslash
import type { Context, DataRecord } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// Baca data session
const session = ctx.getState<DataRecord | null>('session' as never)

// Simpan data session (async)
const setSession = ctx.getState<(data: DataRecord) => Promise<void>>('setSession' as never)
await setSession?.({
  userId: '1'
})

// Hapus session
const clearSession = ctx.getState<() => void>('clearSession' as never)
clearSession?.()
```

## Contoh: Login Dan Logout

```typescript twoslash
import type { Context, DataRecord } from '@neabyte/deserve'

// POST: login, set session saat kredensial valid
export async function POST(ctx: Context): Promise<Response> {
  const body = await ctx.json() as DataRecord
  // Simpan session saat kredensial cocok
  if (body?.username === 'admin' && body?.password === 'secret') {
    const setSession = ctx.getState<(data: DataRecord) => Promise<void>>('setSession' as never)
    await setSession?.({
      userId: '1',
      username: 'admin'
    })
    return ctx.send.json({
      ok: true
    })
  }
  return ctx.send.json(
    {
      error: 'Invalid credentials'
    },
    {
      status: 401
    }
  )
}

// GET: cek status login
export function GET(ctx: Context): Response {
  // Baca session dari framework state
  const session = ctx.getState<DataRecord | null>('session' as never)
  if (!session) {
    return ctx.send.json({
      loggedIn: false
    })
  }
  return ctx.send.json({
    loggedIn: true,
    user: session
  })
}

// DELETE: logout, hapus session
export function DELETE(ctx: Context): Response {
  // Buang cookie session
  const clearSession = ctx.getState<() => void>('clearSession' as never)
  clearSession?.()
  return ctx.send.json({
    ok: true
  })
}
```

## Opsi Session

**`cookieSecret`** wajib, minimal 32 karakter, dan menandatangani cookie dengan HMAC-SHA256. Nama cookie, max age, path, dan atribut keamanan juga bisa dikonfigurasi:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Timpa pengaturan cookie default
router.use(
  Mware.session({
    cookieSecret: Deno.env.get('SESSION_SECRET') ?? 'fallback-secret-at-least-32-characters',
    cookieName: 'sid',
    maxAge: 3600,
    path: '/',
    sameSite: 'Lax',
    httpOnly: true
  })
)
```

| Opsi           | Default     | Keterangan                                      |
| -------------- | ----------- | ----------------------------------------------- |
| `cookieSecret` | -           | **Wajib, min 32 karakter.** Menandatangani cookie. |
| `cookieName`   | `'session'` | Nama cookie                                     |
| `maxAge`       | `86400`     | Umur cookie dalam detik (24 jam)                |
| `path`         | `'/'`       | Path cookie                                     |
| `sameSite`     | `'Lax'`     | `'Strict' \| 'Lax' \| 'None'`                   |
| `httpOnly`     | `true`      | Cookie tidak diakses dari JavaScript            |
| `secure`       | `true`      | Wajibkan HTTPS untuk cookie                     |

### Validasi dan Kedaluwarsa

Middleware memeriksa opsinya saat dibuat dan melempar `Deno.errors.InvalidData` saat ada yang tidak aman:

- `cookieSecret` lebih pendek dari 32 karakter
- `sameSite: 'None'` tanpa `secure: true`, karena browser menolak kombinasi itu
- `maxAge` yang bukan angka positif, atau `path` kosong

Setiap cookie juga membawa waktu terbit bertanda tangan, jadi middleware memperlakukan session yang lebih tua dari `maxAge` sebagai tidak ada dan membacanya kembali sebagai `null`. Cookie yang dirusak gagal pemeriksaan signature dan dibaca sebagai `null` juga, sehingga session basi atau palsu tidak dipercaya. Setiap kali cookie gagal didekode, middleware memancarkan event [`session:invalid`](/id/middleware/observability/events#middleware) yang menyebut cookie dan apakah nilainya dirusak, kedaluwarsa, atau malformed, sementara request lanjut tanpa session terpasang.

## Batasan

- Data session ada di cookie dan ditandatangani dengan HMAC-SHA256, jadi sebaiknya hanya menyimpan identifier atau data kecil daripada nilai besar atau sangat sensitif.
- Session sisi server atau berbasis token butuh mekanisme lain seperti JWT atau Redis di luar middleware ini.
