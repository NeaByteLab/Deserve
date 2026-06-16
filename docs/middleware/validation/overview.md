---
description: "Validate request input with Typebox contracts wired into Deserve through validation middleware."
---

# Validation Overview

> **Reference**: [Typebox GitHub Repository](https://github.com/NeaByteLab/Typebox)

Deserve validates request input through [Typebox](https://github.com/NeaByteLab/Typebox) contracts, a zero-dependency contract library that ships with the framework. A contract describes one source of a request, the validator middleware runs it before the handler, and the handler reads typed data that already passed every rule.

This sits beside the other middleware and watches the request before it reaches a route, the same place [CORS](/middleware/cors) and [Session](/middleware/session) hook in.

## The Three Pieces

Validation comes together from three exports, each with one job:

- **`Define`** builds a contract from a transform and optional guards. See [Define Schema](/middleware/validation/define-schema).
- **`Mware.validator`** turns a schema into middleware that validates request sources. See [Validator Middleware](/middleware/validation/validator-middleware).
- **`Validator`** reads validated data inside a handler and checks values on demand. See [Reading Validated Data](/middleware/validation/reading-data).

![Validation has three pieces with one job each: Define builds a contract, Mware.validator runs the contracts as middleware, and Validator.read returns the typed validated data inside a handler](/diagrams/validation-three-pieces.png)

## A Schema Maps Sources To Contracts

A schema is a plain object that pairs a request source with a contract:

```typescript twoslash
import { Define } from '@neabyte/deserve'

// One contract per request source
const schema = {
  json: Define((body: { name: string }) => body)
}
```

Six sources exist, and each one reads from a matching part of the [Context](/core-concepts/context-object):

| Source    | Reads from      | Shape                     |
| --------- | --------------- | ------------------------- |
| `body`    | `ctx.body()`    | raw parsed body           |
| `cookies` | `ctx.cookie()`  | `Record<string, string>`  |
| `headers` | `ctx.header()`  | `Record<string, string>`  |
| `json`    | `ctx.json()`    | parsed JSON value         |
| `params`  | `ctx.params()`  | `Record<string, string>`  |
| `query`   | `ctx.query()`   | `Record<string, string>`  |

## The Request Flow

A validated request moves through four steps:

1. The validator middleware reads each source named in the schema.
2. It runs the matching contract on that source value.
3. A passing contract stores its output on request state.
4. The handler reads that state with full types.

![The validation request flow: the middleware reads each source with ctx.json or ctx.query, runs the matching contract, stores a passing result on stateKeys.validated, and the handler reads it back typed through Validator.read](/diagrams/validation-request-flow.png)

```typescript twoslash
import { Define, Mware, Router } from '@neabyte/deserve'

const router = new Router({
  routesDir: './routes'
})

const schema = {
  json: Define((body: { name: string }) => ({ name: body.name.trim() }))
}

// Validate the JSON body before the handler
router.use('/users', Mware.validator(schema))

await router.serve(8000)
```

```typescript twoslash
import { type Context, Define, Validator } from '@neabyte/deserve'

const schema = {
  json: Define((body: { name: string }) => ({ name: body.name.trim() }))
}
// ---cut---
export function POST(ctx: Context): Response {
  // Read typed data that already passed
  const { json } = Validator.read<typeof schema>(ctx)
  return ctx.send.json({ created: json.name })
}
```

## Failures Become 422

A contract that rejects its input throws, and the framework maps that throw to a **422 Unprocessable Content** response. The failure reasons ride on `error.cause` as a string array, so a custom handler reads them and surfaces exactly which field went wrong. Error shaping stays in one place through [Object Details](/error-handling/object-details), the same `router.catch` that handles every other error.

A throw from client input never becomes a 500. That mapping rule lives in [Reading Validated Data](/middleware/validation/reading-data#how-failures-surface).

## Where To Go Next

- [Define Schema](/middleware/validation/define-schema) - write a contract with a transform and guards.
- [Validator Middleware](/middleware/validation/validator-middleware) - register validation per source and per route.
- [Reading Validated Data](/middleware/validation/reading-data) - read typed output and check params in a handler.
- [Advanced Patterns](/middleware/validation/advanced-patterns) - pick a schema per method on a shared prefix.
