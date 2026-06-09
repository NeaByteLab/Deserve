---
description: "Why Deserve has no method override, since every HTTP method is a first-class route and the trick is a legacy workaround."
---

# Method Override

Deserve has no method override, and none is needed. Every HTTP method is a first-class route, so there is no verb to fake.

## What Method Override Was For

Method override is an old workaround, not an HTTP feature. The [HTML form](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form#method) element only ever sent `GET` or `POST`, yet REST wanted `PUT`, `PATCH`, and `DELETE`. To bridge that gap, a form sent a `POST` with a hidden `_method` field, or a client added an `X-HTTP-Method-Override` header, and the server ran the handler for the faked verb instead.

The header form had a second use, slipping past old corporate proxies that blocked `PUT` or `DELETE` outright. Both tricks tunneled a real method inside a `POST`.

Neither is a standard. [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110) defines the HTTP methods, and method override is nowhere in it. The `X-HTTP-Method-Override` header is a vendor convention, closest to the `X-HTTP-Method` note in Microsoft's OData spec, not a [WHATWG](https://fetch.spec.whatwg.org/) or IETF rule.

## Why It Is Not Built In

The reason the trick existed is gone. A modern client sends any method straight through, so `fetch(url, { method: 'DELETE' })` reaches a `DELETE` handler with nothing to unwrap. APIs are called from scripts, mobile apps, and HTTP clients now, not raw HTML forms, and proxies that block standard verbs are rare.

Deserve also routes on the real `req.method`, which a handler cannot rewrite mid-request, in line with [build on the platform](/core-concepts/philosophy#build-on-the-platform). That keeps the method honest from the edge to the handler. A middleware that secretly swapped one verb for another would hide intent rather than serve it, so the framework leaves the method as the client sent it.

## Every Method Is a Route

A route file exports one function per method, and the name is the method. There is no table to register and no verb to translate. A file like `items/[id].ts` reads its `id` from the path through [`ctx.param`](/core-concepts/context-object#request-data-access).

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
// Read one item by id
export function GET(ctx: Context): Response {
  return ctx.send.json({ id: ctx.param('id') })
}

// Replace the item
export function PUT(ctx: Context): Response {
  return ctx.send.json({ updated: true })
}

// Remove the item
export function DELETE(ctx: Context): Response {
  return ctx.send.json({ deleted: true })
}
```

The client targets each one by sending the matching method. See [file-based routing](/core-concepts/file-based-routing) for how a file maps to a route.

```typescript twoslash
// Each call hits its own handler
await fetch('/items/42', { method: 'PUT' })
await fetch('/items/42', { method: 'DELETE' })
```

Building stateless or stateful is the same move, just drop the files. A stateless REST endpoint is a handler that reads the request and replies, while a stateful flow adds the [session middleware](/middleware/session) and reads per-user data from [`ctx.state`](/core-concepts/context-object#sharing-state). The method stays real either way, with nothing to disguise on the way in.

A full REST or RESTful API falls out of this with no extra wiring. The verbs already line up with the actions, `GET` to read, `POST` to create, `PUT` and `PATCH` to update, `DELETE` to remove, so a resource is just a route file with those handlers. The behavior reads the same across every endpoint, which is what makes the whole API feel seamless.

## What Deserve Already Handles

The method-aware behavior that override used to need is built in:

- **Supported methods** - `DELETE`, `GET`, `HEAD`, `OPTIONS`, `PATCH`, `POST`, and `PUT` each map to an exported handler.
- **Automatic HEAD** - a route with `GET` answers `HEAD` too, returning headers with no body.
- **Allow header** - a request with an unhandled method gets a `405` carrying an [`Allow`](https://www.rfc-editor.org/rfc/rfc9110#name-allow) header that lists the methods the route does support.

So a `405` already tells the client which verbs are real, which is the honest version of what override tried to paper over.

## When a Real Form Needs Other Methods

A plain HTML form still posts `GET` or `POST` only. The clean path is to send the request with `fetch` from a small script, choosing the method directly, rather than tunneling it through a hidden field. For a deployment that truly cannot change the client, the rewrite belongs at a proxy in front of the app, not inside the handler, which keeps Deserve routing on the method it actually receives.
