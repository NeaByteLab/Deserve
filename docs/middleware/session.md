---
description: "Cookie-based session middleware signed with HMAC-SHA256 for per-user state."
---

# Session Middleware

Session middleware stores session data in a signed cookie and exposes it through framework state, which suits login, preferences, or per-user state without a session database. The cookie payload is signed with HMAC-SHA256, and **`cookieSecret` is required and must be at least 32 characters**.

## Basic Usage

`Mware.session({ cookieSecret })` adds a cookie-based session:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()

// cookieSecret signs the session cookie
router.use(
  Mware.session({
    cookieSecret: Deno.env.get('SESSION_SECRET') ?? 'replace-with-secret-min-32-chars'
  })
)

await router.serve(8000)
```

The middleware stores three values in framework state, read with `ctx.getState`:

- **`session`** - session data, an object or `null` when absent or signature invalid
- **`setSession`** - async function that saves data and sets the signed cookie
- **`clearSession`** - function that clears the session cookie

```typescript twoslash
import type { Context, DataRecord } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// Read session data
const session = ctx.getState<DataRecord | null>('session' as never)

// Save session data (async)
const setSession = ctx.getState<(data: DataRecord) => Promise<void>>('setSession' as never)
await setSession?.({ userId: '1' })

// Clear session
const clearSession = ctx.getState<() => void>('clearSession' as never)
clearSession?.()
```

## Example: Login And Logout

```typescript twoslash
import type { Context, DataRecord } from '@neabyte/deserve'

// POST: login, set session when credentials valid
export async function POST(ctx: Context): Promise<Response> {
  const body = await ctx.json() as DataRecord
  // Save a session on matching credentials
  if (body?.username === 'admin' && body?.password === 'secret') {
    const setSession = ctx.getState<(data: DataRecord) => Promise<void>>('setSession' as never)
    await setSession?.({
      userId: '1',
      username: 'admin'
    })
    return ctx.send.json({ ok: true })
  }
  return ctx.send.json({ error: 'Invalid credentials' }, { status: 401 })
}

// GET: check login status
export function GET(ctx: Context): Response {
  // Read session from framework state
  const session = ctx.getState<DataRecord | null>('session' as never)
  if (!session) {
    return ctx.send.json({ loggedIn: false })
  }
  return ctx.send.json({
    loggedIn: true,
    user: session
  })
}

// DELETE: logout, clear session
export function DELETE(ctx: Context): Response {
  // Drop the session cookie
  const clearSession = ctx.getState<() => void>('clearSession' as never)
  clearSession?.()
  return ctx.send.json({ ok: true })
}
```

## Session Options

**`cookieSecret`** is required, must be at least 32 characters, and signs the cookie with HMAC-SHA256. The cookie name, max age, path, and security attributes are also configurable:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Override the default cookie settings
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

| Option         | Default     | Description                                  |
| -------------- | ----------- | -------------------------------------------- |
| `cookieSecret` | -           | **Required, min 32 characters.** Signs the cookie. |
| `cookieName`   | `'session'` | Cookie name                                  |
| `maxAge`       | `86400`     | Cookie age in seconds (24 hours)             |
| `path`         | `'/'`       | Cookie path                                  |
| `sameSite`     | `'Lax'`     | `'Strict' \| 'Lax' \| 'None'`                |
| `httpOnly`     | `true`      | Cookie not accessible from JavaScript        |
| `secure`       | `true`      | Require HTTPS for the cookie                 |

### Validation and Expiry

The middleware checks its options when created and throws `Deno.errors.InvalidData` when something is unsafe:

- `cookieSecret` shorter than 32 characters
- `sameSite: 'None'` without `secure: true`, since browsers reject that combination
- `maxAge` that is not a positive number, or an empty `path`

Each cookie also carries a signed issue time, so the middleware treats a session older than `maxAge` as absent and reads it back as `null`. A tampered cookie fails the signature check and reads as `null` too, which keeps stale or forged sessions from being trusted.

## Limitations

- Session data lives in the cookie and is signed with HMAC-SHA256, so it should hold only identifiers or small data rather than large or highly sensitive values.
- A server-side or token-based session needs another mechanism such as JWT or Redis outside this middleware.
