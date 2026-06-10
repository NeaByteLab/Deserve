---
description: "Protect against Cross-Site Request Forgery with origin and sec-fetch-site checks."
---

# CSRF Middleware

> **Reference**: [MDN Cross-Site Request Forgery (CSRF)](https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/CSRF)

CSRF middleware blocks forged cross-site requests on state-changing methods. Safe methods (`GET`, `HEAD`, `OPTIONS`) always pass through, and every other method must match the `Origin` header or the `Sec-Fetch-Site` header. A request that matches neither rule is denied with **403 Forbidden**.

## Basic Usage

Add CSRF protection with `Mware.csrf()`:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()

// Same-origin requests pass, others denied
router.use(Mware.csrf())

await router.serve(8000)
```

With no options, the allowed origin defaults to the request origin and `secFetchSite` defaults to `['same-origin']`.

## Allowing Specific Origins

The `origin` option accepts a single value, a list, or a predicate:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Single trusted origin
router.use(Mware.csrf({
  origin: 'https://app.example.com'
}))

// List of trusted origins
router.use(
  Mware.csrf({
    origin: [
      'https://app.example.com',
      'https://admin.example.com'
    ]
  })
)

// Predicate for custom logic
router.use(
  Mware.csrf({
    origin: (value, ctx) => value.endsWith('.example.com')
  })
)
```

## Customizing Sec-Fetch-Site

The `secFetchSite` option follows the same shape and defaults to `['same-origin']`:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Accept same-origin and same-site requests
router.use(
  Mware.csrf({
    secFetchSite: [
      'same-origin',
      'same-site'
    ]
  })
)
```

## CSRF Options

| Option         | Default            | Description                                          |
| -------------- | ------------------ | ---------------------------------------------------- |
| `origin`       | request origin     | Allowed `Origin` value, list, or predicate           |
| `secFetchSite` | `['same-origin']`  | Allowed `Sec-Fetch-Site` value, list, or predicate   |

A predicate receives the header value and the request context, and returns `true` to allow the request:

```typescript
type CsrfRulePredicate = (value: string, ctx: Context) => boolean
```

## How It Works

- **Safe methods** - `GET`, `HEAD`, and `OPTIONS` skip the check and continue.
- **Origin check** - the `Origin` header is compared against the `origin` rule.
- **Sec-Fetch-Site check** - the `Sec-Fetch-Site` header is compared against the `secFetchSite` rule.
- **Allow** - the request passes when either check matches.
- **Deny** - the request is rejected with **403 Forbidden** when neither matches.

## Error Handling

When a request is blocked, the middleware returns message `Request blocked by CSRF protection` with **status code 403**. To shape that response, register a single handler with [`router.catch()`](/error-handling/object-details), or rely on the [default behavior](/error-handling/default-behavior).

A custom `origin` or `secFetchSite` rule that throws fails its own check and falls safe to a refusal, and the fault surfaces as a [`csrf:rule-error`](/middleware/observability/events#middleware) event naming which rule broke instead of staying hidden.
