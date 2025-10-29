# Basic Auth Middleware

> [!WARNING] This feature is available in the development version but not yet released.

> **Reference**: [MDN HTTP Authentication Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Authentication)

HTTP Basic Authentication middleware for protecting routes with username and password authentication. Simple, secure, and easy to configure.

## Basic Usage

Protect routes with Basic Auth using `Mware.basicAuth()`:

```typescript
import { Router, Mware } from '@neabyte/deserve'

const router = new Router()

router.use(
  Mware.basicAuth({
    users: [
      { username: 'admin', password: 'secret' },
      { username: 'user', password: 'pass' }
    ]
  })
)

router.serve(8000)
```

## Route-Specific Protection

Apply Basic Auth only to specific routes:

```typescript
// Protect only /api routes
router.use(
  '/api',
  Mware.basicAuth({
    users: [{ username: 'admin', password: 'secret' }]
  })
)

// Protect admin routes with different credentials
router.use(
  '/admin',
  Mware.basicAuth({
    users: [{ username: 'admin', password: 'admin123' }]
  })
)
```

## Multiple Users

Support multiple user accounts:

```typescript
router.use(
  Mware.basicAuth({
    users: [
      { username: 'admin', password: 'admin123' },
      { username: 'user', password: 'user123' },
      { username: 'guest', password: 'guest123' }
    ]
  })
)
```

## Error Handling

Basic Auth automatically uses `router.catch()` if defined:

```typescript
router.catch((ctx, { statusCode, error }) => {
  if (statusCode === 401) {
    return ctx.send.json(
      { error: 'Authentication required', message: error?.message ?? 'Unauthorized' },
      { status: 401 }
    )
  }
  return ctx.send.json({
    error: error?.message ?? 'Unknown error'
  }, { status: statusCode })
})

router.use(Mware.basicAuth({ users: [...] }))
```

## Browser Authentication

Browsers will automatically prompt for credentials when accessing protected routes:

```
Username: admin
Password: ******
```
