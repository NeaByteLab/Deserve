---
description: "Register validation middleware with Validator.check, scope it per route, and stack sources together."
---

# Validator Middleware

`Validator.check(schema)` turns a schema into middleware. It reads each source named in the schema, runs the matching contract, and stores the result on the context for the handler to read.

## Registering The Middleware

Pass the middleware to `router.use`, the same call that registers every other middleware:

```typescript twoslash
import { Router, Validator } from '@neabyte/deserve'

const router = new Router({
  routes: { directory: './routes' }
})

const createUser = {
  body: Validator.define((body: { name: string }) => ({ name: body.name.trim() }))
}

// Run for every request
router.use(Validator.check(createUser))

await router.serve(8000)
```

## Scoping To A Route

A path prefix limits the validator to matching routes, which follows the rules in [Route-Specific Middleware](/middleware/route-specific):

```typescript twoslash
import { Router, Validator } from '@neabyte/deserve'

const router = new Router({
  routes: { directory: './routes' }
})

const createUser = {
  body: Validator.define((body: { name: string }) => ({ name: body.name.trim() }))
}
// ---cut---
// Validate only under /users
router.use('/users', Validator.check(createUser))
```

For global versus scoped registration in general, see [Global Middleware](/middleware/global).

## Validating Several Sources

A schema can name more than one source, and each contract validates its own slice of the request:

```typescript twoslash
import { Router, Validator } from '@neabyte/deserve'

const router = new Router({ routes: { directory: './routes' } })
// ---cut---
const listUsers = {
  // Page number from the query string
  query: Validator.define(
    (q: Record<string, string>) => ({ page: Number(q['page'] ?? '1') }),
    (q) => (/^\d*$/.test(q['page'] ?? '') ? true : 'page must be numeric')
  ),
  // API key from the request headers
  headers: Validator.define(
    (h: Record<string, string>) => ({ apiKey: h['x-api-key'] ?? '' }),
    (h) => (h['x-api-key'] ? true : 'x-api-key header is required')
  )
}

// Validate query and headers together
router.use('/users', Validator.check(listUsers))
```

Several sources validate in the order their keys appear, and the first failing source stops the rest. That order rule lives in [Advanced Patterns](/middleware/validation/advanced-patterns#order-of-validation).

![Source order: a schema validates its sources in key order, so a failing query contract throws a 422 carrying only the query reason while the headers and cookies contracts after it never run](/diagrams/validation-source-order.png)

## One Schema Per Route

Each validator stores its own result on the context, and a later validator replaces the stored value rather than merging into it. Registering two validators on the same route leaves only the last one readable, so several sources belong in a single schema:

```typescript twoslash
import { Router, Validator } from '@neabyte/deserve'

const router = new Router({ routes: { directory: './routes' } })
// ---cut---
// Combine sources in one schema
const userRules = {
  query: Validator.define((q: Record<string, string>) => ({ page: Number(q['page'] ?? '1') })),
  body: Validator.define((body: { name: string }) => ({ name: body.name.trim() }))
}

// One validator carries both sources
router.use('/users', Validator.check(userRules))
```

The handler reads `query` and `body` together in one call through `ctx.get.validated()`, shown in [Reading Validated Data](/middleware/validation/reading-data).

## Unsupported Sources Are Rejected

A schema that names a source other than `body`, `cookies`, `headers`, or `query` throws `Deno.errors.InvalidData` at registration. Route params resolve after middleware runs, so the middleware would only ever see an empty object. Validate params inside the handler with a direct contract call instead, covered in [Reading Validated Data](/middleware/validation/reading-data#checking-params-in-a-handler).

## An Empty Schema Is Rejected

A schema with no source contract also throws `Deno.errors.InvalidData` at registration, since a validator with nothing to validate is a wiring mistake worth catching early:

```typescript twoslash
import { Validator } from '@neabyte/deserve'

// Throws InvalidData, no sources given
Validator.check({})
```

Both rejections fire when the server starts, not on a request, so a broken schema never reaches production traffic.

## Where To Go Next

- [Reading Validated Data](/middleware/validation/reading-data) - read the stored output in a handler
- [Define Schema](/middleware/validation/define-schema) - shape the contracts a schema points to
- [Advanced Patterns](/middleware/validation/advanced-patterns) - pick a schema per method on a shared prefix
- [Validation Overview](/middleware/validation/overview) - how the pieces fit together
