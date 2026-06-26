---
description: "Why Deserve has no request ID middleware, since the resolved client IP is the trustworthy identity and a random ID is not."
---

# Request ID

Deserve has no request ID middleware, and the reason is about trust. A generated ID identifies nothing, so the framework leans on an identity it can actually compute, the resolved client IP.

## Why It Is Not Built In

A request ID middleware stamps each request with a fresh value, usually from `crypto.randomUUID()`. The catch is what that value means. A server-generated ID is random, so it ties back to no one and carries no fact about the caller. A client-supplied `X-Request-ID` is worse, since a client can send anything, repeat a value, or set it to `0xb33F....`, and trusting that as identity is trusting a header a stranger wrote.

So a random ID is fine as a log label but wrong as a source of truth. Deserve already watches everything from the moment the server starts up to the moment a request reaches the user, through its [lifecycle events](/middleware/observability/overview), so a separate synthetic ID like `0xb33F....` only repeats what the framework already tracks. The identity it can stand behind is the one to reach for.

## The IP Is the Source of Truth

Every request carries [`ctx.get.ip()`](/core-concepts/context-object#ctx-get-ip-options), the resolved client address. It is not read raw from a header. The framework walks the forwarding chain through trusted hops and stops at the first hop it does not trust, so a spoofed header from an untrusted peer never wins.

- **No trusted proxy** - `ctx.get.ip()` is the direct TCP peer, and forwarding headers are ignored entirely.
- **Behind a trusted proxy** - the chain is walked right to left through trusted hops, honoring [`X-Forwarded-For`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-For), the [RFC 7239](https://www.rfc-editor.org/rfc/rfc7239) `Forwarded` header, and single-IP headers like `cf-connecting-ip`.
- **Configured once** - [`trustProxy`](/getting-started/server-configuration#client-ip-resolution) decides which peers count as trusted, so trusting them is a deliberate choice, not a default.

Trusting a proxy fully is correct only because the configuration says so. A framework that guessed would catch the wrong address, so Deserve makes the trust explicit and computes the rest.

## One Request Never Overlaps

Each request gets its own [Context](/core-concepts/context-object), built once when the request arrives and gone when the response is sent. No request is processed twice, and no two requests share state or get validated against each other. A synthetic ID to tell requests apart solves a problem that does not exist, since the lifecycle already keeps them separate.

## Correlating Without a Random ID

For correlating logs, the [lifecycle events](/middleware/observability/overview) already carry what a request ID was meant to provide. Every `request:completed` event includes the resolved `ip`, the `url`, and the `durationMs` in its metadata, plus a `timestamp` on the envelope, so a log line identifies the request from real values rather than a made-up one.

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routes: { directory: './routes' }
})
// ---cut---
router.on((event) => {
  // Correlate by real IP and time
  if (event.kind === 'request:completed') {
    const { ip, url } = event.metadata as { ip?: string, url: string }
    console.log(`${event.timestamp} ${ip ?? 'unknown'} ${url}`)
  }
})

await router.serve(8000)
```

## When a Label Really Helps

A short-lived label for tying log lines together is still possible. When the handler needs to read it back, the signed [session](/middleware/session) carries it like any other per-request value. The point is to treat it as a convenience, not an identity, since the trustworthy answer is `ctx.get.ip()`.

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
router.use(async (ctx, next) => {
  // A label for logs, not trust
  await ctx.set.session({ label: crypto.randomUUID() })
  return await next()
})
```

For trace context that spans services, the right tool is the `traceparent` header covered in [Distributed Tracing](/by-design/tracing#continuing-an-incoming-trace), not a random per-request value.
