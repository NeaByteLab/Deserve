---
description: "Configure how the Deserve server listens, shuts down gracefully, and protects the process."
---

# Server Configuration

> **Reference**: [Deno.serve API Documentation](https://docs.deno.com/api/deno/~/Deno.serve)

Configure a Deserve server with hostname binding and graceful shutdown.

## Basic Server Setup

The simplest way to start a server:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()

// Bind 0.0.0.0 on port 8000
await router.serve(8000)
```

This starts the server on `0.0.0.0:8000`, which covers all interfaces.

## Enhanced Serve Method

Deserve's enhanced `serve` method supports three parameters:

```typescript
// Method signatures
async serve(port?: number): Promise<void>
async serve(port?: number, hostname?: string): Promise<void>
async serve(port?: number, hostname?: string, signal?: AbortSignal): Promise<void>
```

## Hostname Binding

### Bind to Specific Interface

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Bind to localhost only
await router.serve(8000, '127.0.0.1')

// Bind to all interfaces (default)
await router.serve(8000, '0.0.0.0')

// Bind to specific network interface
await router.serve(8000, '192.168.1.100')
```

### Development vs Production

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
// Development - localhost only
await router.serve(8000, '127.0.0.1')

// Production - all interfaces
await router.serve(8000, '0.0.0.0')
```

## Request Timeout

A request timeout is set when creating the router. When middleware and the route handler do not finish within that time, the server responds with **503 Service Unavailable**:

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  requestTimeoutMs: 30_000
})
await router.serve(8000)
```

Omit `requestTimeoutMs` for no timeout (default).

## Template Iteration Limit

The `maxIterations` option caps the iterations per <code v-pre>{{#each}}</code> block in DVE templates, which prevents event loop starvation from one unbounded loop. The default is `100_000`:

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  viewsDir: './views',
  maxIterations: 50_000
})
await router.serve(8000)
```

If a template exceeds the limit, the server responds with **400 Bad Request**. Two companion caps, `maxRenderIterations` for the whole-page loop budget and `maxOutputSize` for total output characters, behave the same way and are listed in [Routes Configuration](/getting-started/routes-configuration#configuration-options). The full rendering behavior lives in [Performance and Limits](/rendering/performance#iteration-limit). For large datasets, use [`streamRender`](/rendering/streaming) instead. For CPU-intensive rendering, consider offloading to a [worker pool](/core-concepts/worker-pool).

## Client IP Resolution

The `trustProxy` option controls how the real client IP is resolved when the server runs behind a proxy or load balancer. Without it, `ctx.ip` returns the direct TCP peer:

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  trustProxy: [
    'loopback',
    '10.0.0.0/8'
  ]
})
await router.serve(8000)
```

When the direct peer matches a trusted rule, Deserve reads the forwarded headers to find the real visitor IP. It checks `CF-Connecting-IP` and `X-Real-IP` first, then walks the `X-Forwarded-For` and RFC 7239 `Forwarded` chain from right to left through trusted hops.

`trustProxy` accepts these values:

- **Preset names** - `'loopback'`, `'linklocal'`, `'uniquelocal'`
- **Exact IPs or CIDR ranges** - for example `'10.0.0.0/8'`
- **A predicate** - `(ip: string) => boolean`

The resolved IP is available on the request context:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Real visitor IP after trustProxy
  const client = ctx.ip
  // Direct TCP peer, ignores forwarded headers
  const peer = ctx.directIp
  return ctx.send.json({
    client,
    peer
  })
}
```

Without a matching `trustProxy` rule, `ctx.ip` and `ctx.directIp` return the same direct peer address. The [IP restriction middleware](/middleware/ip) uses `ctx.ip` for its allow and deny rules.

## Graceful Shutdown

An `AbortSignal` drives graceful server shutdown:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
const ac = new AbortController()

await router.serve(8000, '127.0.0.1', ac.signal)

ac.abort()
```

### Process Signal Handling

Without an `AbortSignal`, the router listens for `SIGINT` and `SIGTERM` itself (only `SIGINT` on Windows) and drains gracefully on either one. No manual signal wiring is needed:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()

// SIGINT and SIGTERM drain automatically
await router.serve(8000, '127.0.0.1')
```

Pass an `AbortSignal` when shutdown needs to be driven from code instead of a signal, as shown above. Note that `Deno.exit()` and other termination calls are blocked while the server runs, so lean on `AbortController` or the built-in signal handling rather than exiting by hand. See [Process Protection](#process-protection) for the reason behind this.

## Process Protection

A serving router installs a process sentinel that keeps the service alive through faults that would normally take it down. This matters because Deserve runs many things in one process - [hot reload](/core-concepts/multi-service#hot-reload) watchers, [worker pools](/core-concepts/worker-pool), and often several [services side by side](/core-concepts/multi-service). One dependency calling `Deno.exit()` should not drop every service at once.

### What Is Blocked

While the server runs, these termination calls are intercepted and turned into a no-op:

- `Deno.exit()` and `Deno.kill()` aimed at the current process
- `process.exit()`, `process.abort()`, `process.reallyExit()`, and `process.kill()` aimed at the current process

A `kill` aimed at another PID still passes through, so only self-termination is blocked. The sentinel is removed once the server stops, which restores normal behavior.

### Not Silent

Every blocked call is reported, never swallowed in silence. The sentinel emits a [`process:error`](/middleware/observability/events#process) event with `origin: 'process:exit'` and a message naming the blocked call, for example `Blocked Deno.exit(0) - process termination is not permitted from application code`. Unhandled rejections and uncaught errors surface the same way with `origin: 'unhandledrejection'` or `'uncaughterror'`.

Subscribe to see them:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
router.on((event) => {
  if (event.kind === 'process:error') {
    const { origin, error } = event.metadata as { origin: string; error: Error }
    // Logs the blocked or uncaught fault
    console.error(`[${origin}]`, error.message)
  }
})
```

See [Error Reporting](/middleware/observability/errors) for the full pattern.

### Threat Model

The goal is availability. A single faulty or hostile code path should not be able to abort the whole process and deny service to every route and service it hosts.

- **Supply chain abuse** - a transitive dependency that calls `process.exit()` or `Deno.exit()`, whether by accident or as an attack, can no longer crash the server. This aligns with [OWASP A03:2025 Software Supply Chain Failures](https://owasp.org/Top10/2025/A03_2025-Software_Supply_Chain_Failures/) and [CWE-1395](https://cwe.mitre.org/data/definitions/1395.html).
- **Denial of service** - blocking self-termination removes an easy availability kill switch, related to [CWE-400](https://cwe.mitre.org/data/definitions/400.html) and [CWE-730](https://cwe.mitre.org/data/definitions/730.html).
- **Uncaught faults** - trapping unhandled rejections and uncaught errors keeps a single bad request from ending the process, related to [CWE-248](https://cwe.mitre.org/data/definitions/248.html).

This is a best-effort defense, not a sandbox. It interposes the known termination entry points rather than isolating untrusted code, so it reduces the blast radius without claiming to stop every possible abuse. Pair it with Deno permission flags and dependency review for stronger guarantees. The layered approach to faults is covered in [Defense in Depth](/error-handling/defense-in-depth).

## Testing Configuration

### Test Basic Server

```bash
# Start server
deno run --allow-net --allow-read main.ts

# Test endpoint
curl http://localhost:8000
```

### Test Hostname Binding

```bash
# Bind to localhost only
deno run --allow-net --allow-read main.ts

# Should work
curl http://127.0.0.1:8000

# Should fail (if binding to 127.0.0.1 only)
curl http://0.0.0.0:8000
```

### Test Graceful Shutdown

```bash
# Start server
deno run --allow-net --allow-read main.ts

# Send SIGINT (Ctrl+C)
# Server should shutdown gracefully
```
