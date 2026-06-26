---
description: "Validate request input with Typebox contracts wired into Deserve through validation middleware."
---

# Validation Overview

> **Reference**: [Typebox GitHub Repository](https://github.com/NeaByteLab/Typebox)

Deserve validates request input through [Typebox](https://github.com/NeaByteLab/Typebox) contracts, a zero-dependency contract library that ships with the framework. A contract describes one source of a request, the validator middleware runs it before the handler, and the handler reads typed data that already passed every rule.

This sits beside the other middleware and watches the request before it reaches a route, the same place [CORS](/middleware/cors) and [Session](/middleware/session) hook in.

## The Three Pieces

Validation comes together from three exports, each with one job:

- **`Validator.define`** builds a contract from a transform and optional guards. See [Define Schema](/middleware/validation/define-schema).
- **`Validator.check`** turns a schema into middleware that validates request sources. See [Validator Middleware](/middleware/validation/validator-middleware).
- **`ctx.get.validated()`** reads validated data inside a handler. See [Reading Validated Data](/middleware/validation/reading-data).

![Validation has three pieces with one job each: Validator.define builds a contract, Validator.check runs the contracts as middleware, and ctx.get.validated returns the typed validated data inside a handler](/diagrams/validation-three-pieces.png)

## A Schema Maps Sources To Contracts

A schema is a plain object that pairs a request source with a contract:

```typescript twoslash
import { Validator } from '@neabyte/deserve'

// One contract per request source
const schema = {
  body: Validator.define((body: { name: string }) => body)
}
```

Four sources exist, and each one reads from a matching part of the [Context](/core-concepts/context-object):

| Source    | Reads from        | Shape                     |
| --------- | ----------------- | ------------------------- |
| `body`    | `ctx.get.body()`  | raw parsed body           |
| `cookies` | `ctx.get.cookie()`| `Record<string, string>`  |
| `headers` | `ctx.get.header()`| `Record<string, string>`  |
| `query`   | `ctx.get.query()` | `Record<string, string>`  |

Route params are not a validation source because they resolve after middleware runs. Validate them inside the handler with a direct contract call, covered in [Reading Validated Data](/middleware/validation/reading-data#checking-params-in-a-handler).

## The Request Flow

A validated request moves through four steps:

1. The validator middleware reads each source named in the schema
2. It runs the matching contract on that source value
3. A passing contract stores its output on the context
4. The handler reads that output with full types through `ctx.get.validated()`

![The validation request flow: the middleware reads each source with ctx.get.body or ctx.get.query, runs the matching contract, stores a passing result on the context, and the handler reads it back typed through ctx.get.validated](/diagrams/validation-request-flow.png)

```typescript twoslash
import { Router, Validator } from '@neabyte/deserve'

const router = new Router({
  routes: { directory: './routes' }
})

const schema = {
  body: Validator.define((body: { name: string }) => ({ name: body.name.trim() }))
}

// Validate the body before the handler
router.use('/users', Validator.check(schema))

await router.serve(8000)
```

```typescript twoslash
import { type Context, Validator } from '@neabyte/deserve'

const schema = {
  body: Validator.define((body: { name: string }) => ({ name: body.name.trim() }))
}
// ---cut---
export function POST(ctx: Context): Response {
  // Read typed data that already passed
  const { body } = ctx.get.validated<typeof schema>()
  return ctx.send.json({ created: body.name })
}
```

## Failures Become 422

A contract that rejects its input throws, and the framework maps that throw to a **422 Unprocessable Content** response. The failure reasons ride on `error.cause` as a string array, so a custom handler reads them and surfaces exactly which field went wrong. Error shaping stays in one place through [Object Details](/error-handling/object-details), the same `router.catch` that handles every other error.

A throw from client input never becomes a 500. That mapping rule lives in [Reading Validated Data](/middleware/validation/reading-data#how-failures-surface).

## Where To Go Next

- [Define Schema](/middleware/validation/define-schema) - write a contract with a transform and guards
- [Validator Middleware](/middleware/validation/validator-middleware) - register validation per source and per route
- [Reading Validated Data](/middleware/validation/reading-data) - read typed output and check params in a handler
- [Advanced Patterns](/middleware/validation/advanced-patterns) - pick a schema per method on a shared prefix
