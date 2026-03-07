# Session Middleware

Session middleware stores session data in a cookie and exposes it via `ctx.state`, suitable for login, preferences, or per-user state without a session database.

## Basic Usage

Use `Mware.session()` to add cookie-based session:

```typescript
// 1. Import Router and Mware
import { Router, Mware } from '@neabyte/deserve'

// 2. Create router
const router = new Router()

// 3. Apply session middleware (cookie-based)
router.use(Mware.session())

// 4. Start server
await router.serve(8000)
```

After that, in route handlers or middleware:

- **`ctx.state.session`** - Session data (object or `null` if none yet)
- **`ctx.state.setSession(data)`** - Save data to session (sets cookie)
- **`ctx.state.clearSession()`** - Clear session (clear cookie)

## Example: Login And Logout

```typescript
import type { Context } from '@neabyte/deserve'

// POST: login — set session if credentials valid
export async function POST(ctx: Context): Promise<Response> {
  // 1. Read JSON body (username, password)
  const body = await ctx.json()
  // 2. Check credentials; if valid, save to session
  if (body?.username === 'admin' && body?.password === 'secret') {
    ctx.state.setSession({ userId: '1', username: 'admin' })
    return ctx.send.json({ ok: true })
  }
  // 3. Invalid → 401
  return ctx.send.json({ error: 'Invalid credentials' }, { status: 401 })
}

// GET: check login status
export function GET(ctx: Context): Response {
  // 1. Read session from ctx.state (filled by middleware)
  const session = ctx.state.session
  if (!session) {
    return ctx.send.json({ loggedIn: false })
  }
  // 2. Session exists → send user data
  return ctx.send.json({ loggedIn: true, user: session })
}

// DELETE: logout — clear session
export function DELETE(ctx: Context): Response {
  // 1. Clear session cookie
  ctx.state.clearSession()
  return ctx.send.json({ ok: true })
}
```

## Session Options

You can change cookie name, max age, path, and security attributes:

```typescript
// 1. Apply session with custom options
router.use(
  Mware.session({
    cookieName: 'sid',
    maxAge: 3600,
    path: '/',
    sameSite: 'Lax',
    httpOnly: true
  })
)
```

| Option       | Default     | Description                          |
| ------------ | ----------- | ------------------------------------ |
| `cookieName` | `'session'` | Cookie name                          |
| `maxAge`     | `86400`     | Cookie age in seconds (24 hours)     |
| `path`       | `'/'`       | Cookie path                          |
| `sameSite`   | `'Lax'`     | `'Strict' \| 'Lax' \| 'None'`       |
| `httpOnly`   | `true`      | Cookie not accessible from JavaScript |

## Limitations

- Session data is stored in the cookie (base64 + JSON). Do not store large or sensitive data; use only for identifiers or small data.
- For server-side or token-based session, use another mechanism (JWT, Redis, etc.) outside this middleware.
