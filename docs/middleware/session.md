---
description: "Cookie-based session middleware signed with HMAC-SHA256 for per-user state."
---

# Session Middleware

Session middleware stores session data in a signed cookie and exposes it through the context, which suits login, preferences, or per-user state without a session database. The cookie payload is signed with HMAC-SHA256, and **`secret` is required and must be at least 32 characters**.

## Basic Usage

`Mware.session({ secret })` adds a cookie-based session:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()

// Secret signs the session cookie
router.use(
  Mware.session({
    secret: Deno.env.get('SESSION_SECRET') ?? 'replace-with-secret-min-32-chars'
  })
)

await router.serve(8000)
```

The middleware installs a session controller on the context, so a handler reads and writes session data through `ctx.get.session()` and `ctx.set.session()`:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// Read current session data
const session = ctx.get.session()

// Save session data (async)
await ctx.set.session({ userId: '1' })

// Clear session
await ctx.set.session(null)
```

`ctx.get.session()` returns the session data object or `null` when no session exists. `ctx.set.session(data)` signs the data into a cookie, and `ctx.set.session(null)` clears it.

## Example: Login And Logout

```typescript twoslash
import type { Context } from '@neabyte/deserve'

// POST: login, set session when credentials valid
export async function POST(ctx: Context): Promise<Response> {
  // Read parsed JSON body
  const body = await ctx.get.json() as { username?: string; password?: string }
  // Save a session on matching credentials
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

// GET: check login status
export function GET(ctx: Context): Response {
  // Read session from context
  const session = ctx.get.session()
  if (!session) {
    return ctx.send.json({ loggedIn: false })
  }
  return ctx.send.json({
    loggedIn: true,
    user: session
  })
}

// DELETE: logout, clear session
export async function DELETE(ctx: Context): Promise<Response> {
  // Drop the session cookie
  await ctx.set.session(null)
  return ctx.send.json({ ok: true })
}
```

## Session Options

**`secret`** is required, must be at least 32 characters, and signs the cookie with HMAC-SHA256. The cookie name, max age, path, and security attributes are also configurable:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Override the default cookie settings
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

| Option     | Default     | Description                                          |
| ---------- | ----------- | ---------------------------------------------------- |
| `secret`   | -           | **Required, min 32 characters.** Signs the cookie.   |
| `name`     | `'session'` | Cookie name                                          |
| `maxAge`   | `86400`     | Cookie age in seconds (24 hours)                     |
| `path`     | `'/'`       | Cookie path                                          |
| `sameSite` | `'Lax'`     | `'Strict' \| 'Lax' \| 'None'`                        |
| `httpOnly` | `true`      | Cookie not accessible from JavaScript                |
| `secure`   | `false`     | Require HTTPS for the cookie                         |

### Validation and Expiry

The middleware checks its options when created and throws `Deno.errors.InvalidData` when something is unsafe:

- `secret` shorter than 32 characters
- `sameSite: 'None'` without `secure: true`, since browsers reject that combination
- `maxAge` that is not a positive whole number

Each cookie also carries a signed issue time, so the middleware treats a session older than `maxAge` as absent and reads it back as `null`. A tampered cookie fails the signature check and reads as `null` too, which keeps stale or forged sessions from being trusted. Whenever a cookie fails to decode, the middleware emits a [`session:invalid`](/middleware/observability/events) event naming the cookie and whether the value was tampered with, expired, or malformed, while the request continues with no session attached.

## Limitations

- Session data lives in the cookie and is signed with HMAC-SHA256, so it should hold only identifiers or small data rather than large or highly sensitive values
- A server-side or token-based session needs another mechanism such as JWT or Redis outside this middleware
