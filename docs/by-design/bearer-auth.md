---
description: "Why Deserve ships Basic Auth but no Bearer middleware, and how to compose token auth for any scheme."
---

# Bearer Auth

Deserve ships [Basic Auth](/middleware/basic-auth) but no Bearer middleware, and the split between the two is the whole point.

## Why It Is Not Built In

Bearer is only an envelope. The [`Authorization: Bearer <token>`](https://datatracker.ietf.org/doc/html/rfc6750) header carries a token, and what counts as a valid token changes with the ecosystem. One service verifies a [JWT](https://datatracker.ietf.org/doc/html/rfc7519) signature, another fetches a rotating public key from a [JWKS](https://datatracker.ietf.org/doc/html/rfc7517) endpoint, another calls an introspection API for an opaque token, and the signing algorithm can be RS256, ES256, or HS256.

Baking one of those choices in would lock every project into a single scheme. When the spec moves or a team rotates keys a different way, that built-in answer turns into a cage rather than a help. So the decision is to leave the verification open and let the developer bring the scheme the use case needs.

## Why Basic Auth Ships But Bearer Does Not

[Basic Auth](/middleware/basic-auth) is one fixed scheme. The header carries a base64 username and password, the check is a constant-time compare against a list, and there is nothing to choose. That stability is why it fits inside the framework.

Bearer is the opposite. The token format, the signature, and the trust source all vary, so there is no single check to ship. Both schemes read the same `Authorization` header, but only one has a single correct answer.

## The Pieces Already in Place

A token guard is a small composition over parts that already ship:

- **Read the header** - [`ctx.header('authorization')`](/core-concepts/context-object#request-data-access) returns the raw `Authorization` value.
- **Run early** - [global middleware](/middleware/global) runs before route handlers and can stop a request by returning a `Response`.
- **Reject cleanly** - [`ctx.handleError(401, ...)`](/core-concepts/context-object#error-handling) routes through [`router.catch()`](/error-handling/object-details) when one is set.
- **Carry the result** - [`ctx.state`](/core-concepts/context-object#sharing-state) hands the decoded identity to the handler downstream.

## A Bearer Guard

This middleware pulls the token out of the header, verifies it, and stores the result for later handlers. The `verifyToken` placeholder stands in for the scheme of choice, a JWT check, a JWKS lookup, or an introspection call.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
import { Router } from '@neabyte/deserve'

const router = new Router()
declare function verifyToken(token: string): Promise<{ userId: string } | null>
// ---cut---
router.use(async (ctx, next) => {
  const header = ctx.header('authorization')
  const spaceIndex = header ? header.indexOf(' ') : -1
  const scheme = spaceIndex > 0 ? header!.slice(0, spaceIndex) : ''

  // Reject anything that is not Bearer
  if (scheme.toLowerCase() !== 'bearer') {
    return await ctx.handleError(401, new Error('Missing Bearer token'))
  }

  // Verify with the scheme of choice
  const token = header!.slice(spaceIndex + 1).trim()
  const claims = await verifyToken(token)
  if (!claims) {
    return await ctx.handleError(401, new Error('Invalid token'))
  }

  // Hand the identity to handlers
  ctx.state.userId = claims.userId
  return await next()
})

await router.serve(8000)
```

The handler then reads the identity straight from state, with no token parsing of its own.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Read what the guard stored
  const userId = ctx.state.userId
  return ctx.send.json({ userId })
}
```

## Routing Failures Through One Handler

The guard above returns the `401` from inside the middleware. To send every auth failure through one place, wrap the middleware with [`WrapMware`](/middleware/global#wrapping-middleware-with-error-handling) and throw on rejection, then shape the reply with [`router.catch()`](/error-handling/object-details).

```typescript twoslash
import type { Context } from '@neabyte/deserve'
import { Router, WrapMware } from '@neabyte/deserve'

const router = new Router()
declare function verifyToken(token: string): Promise<{ userId: string } | null>
// ---cut---
// Throws reach router.catch when wrapped
const bearer = WrapMware('Bearer', async (ctx: Context, next) => {
  const header = ctx.header('authorization')
  if (!header?.toLowerCase().startsWith('bearer ')) {
    throw new Error('Missing Bearer token')
  }
  const claims = await verifyToken(header.slice(7).trim())
  if (!claims) {
    throw new Error('Invalid token')
  }
  ctx.state.userId = claims.userId
  return await next()
})

// Apply the guard and error shape
router.use(bearer)
router.catch((ctx, err) => ctx.send.json({ error: err.error?.message }, { status: 401 }))
```

This is the same wrapping pattern [Basic Auth](/middleware/basic-auth) uses internally, now carrying a token check instead of a credential compare.

## Guarding Only Some Routes

A token guard often belongs on an API prefix while public pages stay open. Path-specific middleware scopes the check to one prefix, the same form shown in [global middleware](/middleware/global#path-specific-middleware).

```typescript twoslash
import type { Context } from '@neabyte/deserve'
import { Router } from '@neabyte/deserve'

const router = new Router()
declare function verifyToken(token: string): Promise<{ userId: string } | null>
// ---cut---
// Guard only the /api routes
router.use('/api', async (ctx, next) => {
  const header = ctx.header('authorization')
  const claims = header?.toLowerCase().startsWith('bearer ')
    ? await verifyToken(header.slice(7).trim())
    : null
  if (!claims) {
    return await ctx.handleError(401, new Error('Invalid token'))
  }
  ctx.state.userId = claims.userId
  return await next()
})
```

For a server-side session signed by the framework instead of a token, see the [session middleware](/middleware/session).
