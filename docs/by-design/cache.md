---
description: "Why Deserve has no cache middleware, and how stateless sessions plus plain in-memory maps cover the need."
---

# Caching

Deserve ships no cache middleware, and the request pipeline holds no hidden store of its own. That keeps memory behavior predictable, and it leaves the caching strategy to the developer.

## Why It Is Not Built In

Most of what people reach for a cache to do is hold a little per-user state across requests. That job is already covered. The [session middleware](/middleware/session) keeps per-user data in a signed cookie, with no server-side store to grow, expire, or evict. For the common 80 percent, login state and preferences, the data rides with the client and the server stays stateless.

A general cache middleware would have to pick an eviction policy, a key strategy, and a memory budget for everyone at once, and those choices belong to the application, not the framework. So the decision is to leave the store out and let the developer hold exactly what the use case needs.

## Memory Stays Clean Under Load

A built-in cache feels tempting because memory can creep up over time. That worry does not apply to the framework itself. The request pipeline allocates per request and lets each [Context](/core-concepts/context-object) fall out of scope once the response is sent, so no internal table grows with traffic. Under sustained high-load traffic the framework leaks nothing across the pipeline, and the runtime reclaims each finished request on its own.

Garbage collection is the runtime's job, in line with [build on the platform](/core-concepts/philosophy#build-on-the-platform). Deno and V8 own the heap and the collector, and Deserve neither fights them nor wraps them. Anything the application caches lives in application memory, where its lifetime is the developer's to decide.

## Holding Data In Memory

When a value really does need to live on the server, a plain `Map` declared at module scope is the whole pattern. It is created once and shared across every request to that module.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
// One store shared across requests
const cache = new Map<string, unknown>()

export async function GET(ctx: Context): Promise<Response> {
  const key = ctx.pathname

  // Serve the cached value when present
  const hit = cache.get(key)
  if (hit !== undefined) {
    return ctx.send.json({ source: 'cache', data: hit })
  }

  // Build it once, then store for next time
  const data = await buildExpensiveData()
  cache.set(key, data)
  return ctx.send.json({ source: 'fresh', data })
}

declare function buildExpensiveData(): Promise<unknown>
```

## Expiring Entries

A `Map` never evicts on its own, so a long-running cache needs a time-to-live. Store the value with an expiry stamp and treat an old entry as a miss.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
// Tune how long an entry stays fresh
const ttlMs = 30_000
const cache = new Map<string, { value: unknown, expiresAt: number }>()

export function GET(ctx: Context): Response {
  const key = ctx.pathname
  const entry = cache.get(key)

  // Fresh entry wins, expired one is dropped
  if (entry && Date.now() < entry.expiresAt) {
    return ctx.send.json({ source: 'cache', data: entry.value })
  }

  // Recompute and stamp a new expiry
  const value = { time: Date.now() }
  cache.set(key, { value, expiresAt: Date.now() + ttlMs })
  return ctx.send.json({ source: 'fresh', data: value })
}
```

A `Map` keyed by request data grows with every distinct key, so cap it or sweep expired entries on a timer. When the keys are objects rather than strings, a `WeakMap` lets the runtime drop entries once the key is gone, which fits per-object metadata without manual cleanup.

## When Memory Is Not Enough

Two cases call for more than a process-local map. A cache that must survive a restart, or be shared across several instances, belongs in an external store like [Redis](https://redis.io/), reached with a normal client inside the handler. A cache that simply needs more room can run in memory once the V8 heap is raised at startup. The heap size is a runtime flag, not a framework setting, so the [Deno documentation](https://docs.deno.com/runtime/) is the place for the exact invocation.

## Per-Request Sharing

Caching across requests is one need, passing a value along a single request is another. A value computed in middleware and read by the handler does not belong in a cache at all, it belongs in [`ctx.state`](/core-concepts/context-object#sharing-state), which lives for exactly one request and is gone when the response is sent.
