---
description: "How Deserve parses and handles incoming requests, including body parsing and content negotiation."
---

# Request Handling

> **Reference**: [Deno Request API Documentation](https://docs.deno.com/deploy/classic/api/runtime-request/)

Deserve provides a `Context` object that wraps the native `Request`, so query, route params, headers, cookies, and body all come through Context without manual parsing. For the full Context surface, including response helpers and error handling, see [Context Object](/core-concepts/context-object).

A handler receives one `Context` and reads whatever it needs from the `ctx.get` namespace:

```typescript twoslash
import type { Context } from '@neabyte/deserve'

// Read request data from ctx.get
export function GET(ctx: Context): Response {
  const query = ctx.get.query()
  return ctx.send.json({ query })
}
```

The sections below cover each kind of input. Every reader lives on `ctx.get` and is documented in full in [Context Object](/core-concepts/context-object).

## Query Parameters

Query strings are parsed on first access, then cached. `ctx.get.query()` returns the full record, and `ctx.get.query(key)` returns one value. The first value wins for duplicate keys:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
// URL: /search?q=deno&limit=10
export function GET(ctx: Context): Response {
  const query = ctx.get.query()
  return ctx.send.json({
    search: query.q,
    limit: parseInt(query.limit || '10')
  })
}
```

When a key repeats in the URL, the first value is kept:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// URL: /search?tag=deno&tag=typescript
ctx.get.query('tag')  // 'deno', first value wins
ctx.get.query()       // { tag: 'deno' }
```

## Route Parameters

Dynamic segments from [file-based routing](/core-concepts/file-based-routing) arrive as route params, read one at a time with `ctx.get.param(key)` or all at once with `ctx.get.param()`:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
// routes/users/[id]/posts/[postId].ts
// URL: /users/123/posts/456
export function GET(ctx: Context): Response {
  const id = ctx.get.param('id')   // '123'
  const all = ctx.get.param()      // { id: '123', postId: '456' }
  return ctx.send.json({ id, all })
}
```

Values are percent-decoded once before the handler reads them. How patterns are matched is covered in [Route Patterns](/core-concepts/route-patterns).

## Headers

Headers are read through `ctx.get.header()`. Pass a key to read one header, or call with no arguments to read all headers as a record. Keys match case-insensitively:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// Read one header by name
const contentType = ctx.get.header('content-type')

// Read all headers as a record
const headers = ctx.get.header()
```

For direct access to the native `Headers` object, use `ctx.get.request().headers`:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// Access raw Headers API
const contentType = ctx.get.request().headers.get('Content-Type')
```

## Cookies

Cookies are read through `ctx.get.cookie()`. Pass a key to read one cookie, or call with no arguments to read all cookies as a record. Cookies parse once and cache for later calls:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
declare const ctx: Context
// ---cut---
// Read one cookie by name
const sessionId = ctx.get.cookie('sessionId')

// Read all cookies as a record
const cookies = ctx.get.cookie() // { sessionId: 'abc123', theme: 'dark' }
```

## Body

The body is read through one of several async methods on `ctx.get`. The format is chosen automatically by `ctx.get.body()` based on the `Content-Type` header, or forced by calling a specific reader:

| Method | Format | Content-Type |
| ------ | ------ | ------------ |
| `ctx.get.body()` | Auto-detected | JSON, form-data, or text |
| `ctx.get.json()` | JSON | Any |
| `ctx.get.text()` | Plain text | Any |
| `ctx.get.formData()` | Form data | Any |
| `ctx.get.blob()` | Blob | Any |
| `ctx.get.bytes()` | Uint8Array | Any |

The body can only be read once. A second call with the same format returns the cached value, while a second call with a different format throws a **409 Conflict**.

### Auto-detected Body

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
// POST /api/users with JSON body
export async function POST(ctx: Context): Promise<Response> {
  // Body parses based on Content-Type
  const body = await ctx.get.body()
  return ctx.send.json({ created: body })
}
```

### JSON Body

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
// POST /api/users with JSON body
export async function POST(ctx: Context): Promise<Response> {
  // Parse body as JSON
  const body = await ctx.get.json()
  return ctx.send.json({ created: body })
}
```

### Form Data

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
// POST /api/users with form data
export async function POST(ctx: Context): Promise<Response> {
  // Parse body as form data
  const formData = await ctx.get.formData()
  const name = formData.get('name')
  return ctx.send.json({ name })
}
```

### Raw Text

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
// POST /api/text with plain text
export async function POST(ctx: Context): Promise<Response> {
  // Read body as plain text
  const text = await ctx.get.text()
  return ctx.send.text(text)
}
```

### Binary Data

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
// POST /api/upload with binary data
export async function POST(ctx: Context): Promise<Response> {
  // Read body as byte array
  const bytes = await ctx.get.bytes()
  return ctx.send.json({ size: bytes.byteLength })
}
```

## URL and Pathname

URL details are read through `ctx.get.url()` and `ctx.get.pathname()`:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  const url = ctx.get.url()       // URL instance
  const pathname = ctx.get.pathname() // '/api/users/123'
  return ctx.send.json({
    path: pathname,
    fullUrl: url.href
  })
}
```

## Client IP

The client IP is read through `ctx.get.ip()`. Pass `{ direct: true }` to read the direct TCP peer instead of the resolved IP:

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  const client = ctx.get.ip()                // resolved visitor IP
  const peer = ctx.get.ip({ direct: true })  // direct TCP peer
  return ctx.send.json({ client, peer })
}
```

Both return `undefined` when the peer is unknown. Without a matching [`trustProxy`](/getting-started/server-configuration#client-ip-resolution) rule, both return the same direct peer address. The [IP restriction middleware](/middleware/ip) uses `ctx.get.ip()` for its allow and deny rules.

## Validating Before The Handler

Every reader above hands back the raw value as it arrived, so a handler still checks the shape itself. A schema moves those checks ahead of the handler, runs a contract against each source, and leaves only data that already passed. See [Validation Overview](/middleware/validation/overview) for how `ctx.get.json()`, `ctx.get.query()`, and the other readers feed a contract.
