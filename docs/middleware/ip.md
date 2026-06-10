---
description: "Restrict access by IP address using whitelist and blacklist rules with CIDR support."
---

# IP Restriction Middleware

IP restriction middleware allows or denies requests by the resolved client IP address. The whitelist takes precedence, the blacklist runs next, and the check fails safe by denying any request with an unknown IP. Each rule accepts an exact address, a CIDR range, or the `*` wildcard, and both IPv4 and IPv6 are supported.

## Basic Usage

Allow only trusted addresses with `Mware.ip()`:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()

// Allow only listed addresses
router.use(
  Mware.ip({
    whitelist: [
      '127.0.0.1',
      '192.168.1.0/24'
    ]
  })
)

await router.serve(8000)
```

## Blocking Addresses

Use `blacklist` to deny specific addresses while allowing the rest:

```typescript twoslash
import { Mware, Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Deny listed addresses, allow others
router.use(
  Mware.ip({
    blacklist: [
      '203.0.113.5',
      '198.51.100.0/24'
    ]
  })
)
```

## Rule Formats

Each entry in `whitelist` or `blacklist` can be one of these:

```typescript
// Exact IPv4 or IPv6 address
'127.0.0.1'
'::1'

// CIDR range
'10.0.0.0/8'
'fc00::/7'

// Wildcard, matches every address
'*'
```

A malformed rule throws `Deno.errors.InvalidData` when the middleware is created.

## IP Options

| Option      | Default | Description                          |
| ----------- | ------- | ------------------------------------ |
| `whitelist` | -       | Allowed IP, CIDR, or wildcard rules  |
| `blacklist` | -       | Denied IP, CIDR, or wildcard rules   |

## How It Works

- **Unknown IP** - a request with no resolved IP is denied.
- **Whitelist present** - only IPs that match the whitelist pass, everything else is denied.
- **Blacklist present** - IPs that match the blacklist are denied, the rest pass.
- **Neither set** - every request passes.

The middleware reads the resolved client IP from `ctx.ip`. Behind a proxy, configure [`trustProxy`](/getting-started/server-configuration#client-ip-resolution) so the real visitor IP is used.

## Error Handling

When a request is denied, the middleware fails with **403** and message `Access denied by IP restriction`. That failure routes through the [central error handler](/error-handling/object-details), so shape the response there or rely on the [default behavior](/error-handling/default-behavior).
