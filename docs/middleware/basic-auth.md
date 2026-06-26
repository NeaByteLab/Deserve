---
description: "Protect routes with HTTP Basic Authentication middleware in Deserve."
---

# Basic Auth Middleware

> **Reference**: [MDN HTTP Authentication Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Authentication)

HTTP Basic Authentication middleware protects routes with username and password credentials, and stays simple and secure to configure.

## Basic Usage

Protect routes with Basic Auth using `Mware.basicAuth()`:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()

// Guard routes with a user list
router.use(
  Mware.basicAuth({
    users: [
      {
        username: 'admin',
        password: 'secret'
      },
      {
        username: 'user',
        password: 'pass'
      }
    ]
  })
)

await router.serve(8000)
```

## Route-Specific Protection

Apply Basic Auth only to specific routes:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Protect only /api routes
router.use(
  '/api',
  Mware.basicAuth({
    users: [
      {
        username: 'admin',
        password: 'secret'
      }
    ]
  })
)

// Protect admin routes with different credentials
router.use(
  '/admin',
  Mware.basicAuth({
    users: [
      {
        username: 'admin',
        password: 'admin123'
      }
    ]
  })
)
```

## Multiple Users

Support multiple user accounts:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
router.use(
  Mware.basicAuth({
    users: [
      {
        username: 'admin',
        password: 'admin123'
      },
      {
        username: 'user',
        password: 'user123'
      },
      {
        username: 'guest',
        password: 'guest123'
      }
    ]
  })
)
```

## Custom Realm

The `realm` names the protected area in the browser prompt and defaults to `'Secure Area'`:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Name the area shown in the prompt
router.use(
  Mware.basicAuth({
    realm: 'Admin Panel',
    users: [
      {
        username: 'admin',
        password: 'secret'
      }
    ]
  })
)
```

## Error Handling

A failed login fails with **401 Unauthorized** and a `WWW-Authenticate: Basic realm="..."` header, which is what makes browsers show the login prompt. The realm defaults to `'Secure Area'` and can be overridden through the `realm` option. Credentials are checked in constant time to avoid timing leaks, and an empty `users` array throws `Deno.errors.InvalidData` when the middleware is created.

Each rejection emits an `auth:failed` event with the reason - `missing`, `malformed`, or `invalid` - covered in [Event Reference](/middleware/observability/events). The 401 routes through the [central error handler](/error-handling/object-details), so shape the response there or rely on the [default behavior](/error-handling/default-behavior).

## Browser Authentication

Browsers prompt for credentials automatically when a protected route is accessed:

```
Username: admin
Password: ******
```
