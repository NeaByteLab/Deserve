---
description: "Register validation middleware with Mware.validator, scope it per route, and stack sources together."
---

# Validator Middleware

`Mware.validator(schema)` turns a schema into middleware. It reads each source named in the schema, runs the matching contract, and stores the result on request state for the handler to read.

## Registering The Middleware

Pass the middleware to `router.use`, the same call that registers every other middleware:

```typescript twoslash
import { Define, Mware, Router } from '@neabyte/deserve'

const router = new Router({
  routesDir: './routes'
})

const createUser = {
  json: Define((body: { name: string }) => ({ name: body.name.trim() }))
}

// Run for every request
router.use(Mware.validator(createUser))

await router.serve(8000)
```

## Scoping To A Route

A path prefix limits the validator to matching routes, which follows the rules in [Route-Specific Middleware](/middleware/route-specific):

```typescript twoslash
import { Define, Mware, Router } from '@neabyte/deserve'

const router = new Router({
  routesDir: './routes'
})

const createUser = {
  json: Define((body: { name: string }) => ({ name: body.name.trim() }))
}
// ---cut---
// Validate only under /users
router.use('/users', Mware.validator(createUser))
```

For global versus scoped registration in general, see [Global Middleware](/middleware/global).

## Validating Several Sources

A schema can name more than one source, and each contract validates its own slice of the request:

```typescript twoslash
import { Define, Mware, Router } from '@neabyte/deserve'

const router = new Router({ routesDir: './routes' })
// ---cut---
const listUsers = {
  // Page number from the query string
  query: Define(
    (q: Record<string, string>) => ({ page: Number(q['page'] ?? '1') }),
    (q) => (/^\d*$/.test(q['page'] ?? '') ? true : 'page must be numeric')
  ),
  // API key from the request headers
  headers: Define(
    (h: Record<string, string>) => ({ apiKey: h['x-api-key'] ?? '' }),
    (h) => (h['x-api-key'] ? true : 'x-api-key header is required')
  )
}

// Validate query and headers together
router.use('/users', Mware.validator(listUsers))
```

Several sources validate in the order their keys appear, and the first failing source stops the rest. That order rule lives in [Advanced Patterns](/middleware/validation/advanced-patterns#order-of-validation).

![Source order: a schema validates its sources in key order, so a failing query contract throws a 422 carrying only the query reason while the headers and cookies contracts after it never run](/diagrams/validation-source-order.png)

## Stacking Validators

Registering more than one validator on the same route merges their results. Each validator adds its own sources to the shared state, so a later read sees every validated source at once:

```typescript twoslash
import { Define, Mware, Router } from '@neabyte/deserve'

const router = new Router({ routesDir: './routes' })

const queryRules = {
  query: Define((q: Record<string, string>) => ({ page: Number(q['page'] ?? '1') }))
}
const bodyRules = {
  json: Define((body: { name: string }) => ({ name: body.name.trim() }))
}
// ---cut---
// Two validators feed one merged state
router.use('/users', Mware.validator(queryRules))
router.use('/users', Mware.validator(bodyRules))
```

The handler reads the merged `query` and `json` in one call, shown in [Reading Validated Data](/middleware/validation/reading-data).

## Params Are Rejected Here

A schema that names `params` throws at registration with [`Deno.errors.InvalidData`](https://docs.deno.com/api/deno/~/Deno.errors.InvalidData). Route params resolve after middleware runs, so the middleware would only ever see an empty object. The error points to the right tool:

```typescript twoslash
import { Define, Mware } from '@neabyte/deserve'

// Throws InvalidData at registration
Mware.validator({
  params: Define((p: Record<string, string>) => p)
})
```

Validate params inside the handler with `Validator.check` instead, covered in [Reading Validated Data](/middleware/validation/reading-data#checking-params-in-a-handler).

## An Empty Schema Is Rejected

A schema with no source contract also throws [`Deno.errors.InvalidData`](https://docs.deno.com/api/deno/~/Deno.errors.InvalidData) at registration, since a validator with nothing to validate is a wiring mistake worth catching early:

```typescript twoslash
import { Mware } from '@neabyte/deserve'

// Throws InvalidData, no sources given
Mware.validator({})
```

Both rejections fire when the server starts, not on a request, so a broken schema never reaches production traffic.

## Where To Go Next

- [Reading Validated Data](/middleware/validation/reading-data) - read the stored output in a handler.
- [Define Schema](/middleware/validation/define-schema) - shape the contracts a schema points to.
- [Advanced Patterns](/middleware/validation/advanced-patterns) - pick a schema per method on a shared prefix.
- [Validation Overview](/middleware/validation/overview) - how the pieces fit together.
