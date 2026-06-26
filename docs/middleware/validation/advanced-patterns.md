---
description: "Pick the right validator per request when one prefix hosts several methods, the selectValidator pattern."
---

# Advanced Patterns

A prefix validator runs for every method and every nested path under that prefix. That is fine when one schema fits the whole prefix, but a real resource often mixes shapes under a single path. This page covers the pattern that picks the right schema per request.

## Validators Run Before Routing

Middleware runs before the router matches a method or a path, so a prefix validator fires on every request the prefix touches, even ones no handler serves. A validator on `/accounts` runs for `POST /accounts` and for `GET /accounts/anything`, both before the router decides there is no such route.

When that validator fails, its 422 reaches the client first and hides the status the router would have produced:

- `POST /accounts` with a missing header returns **422**, not the **405** the missing POST handler would give
- `GET /accounts/missing` with a missing header returns **422**, not the **404** for an unknown path

Gating the validator by method and path keeps validation on the requests it belongs to and lets the router answer the rest. With the right gate, `POST /transfers/tx_abc123` returns a clean **405** instead of a body-validation 422, because the validator skips a request it was never meant to check.

## One Prefix, Several Shapes

`router.use('/transfers', ...)` matches `/transfers` and every path that continues with a slash, such as `/transfers/tx_abc123`. The matching rule comes from [Route-Specific Middleware](/middleware/route-specific). A `transfers` resource usually carries two different requests under that one prefix:

- `POST /transfers` sends a JSON body that needs a `body` contract
- `GET /transfers/:id` carries no body and validates its param inside the handler

Registering a `body` validator on the whole prefix would run it on the GET too, and reading a body that is not there turns a valid request into a failure. The validator needs to fire only for the POST.

## The selectValidator Helper

A small wrapper solves it. It takes a picker that returns a schema for the current request or `undefined` to skip, builds the validator on demand, and caches it so each schema is wrapped once:

![The selectValidator pattern: a request on a shared prefix reaches a picker that reads the method and pathname, returning a schema builds and caches the validator once before the handler, and returning undefined calls next so the request flows through untouched](/diagrams/validation-select-validator.png)

```typescript twoslash
import { type Context, type MiddlewareFn, Validator, type ValidationSchema } from '@neabyte/deserve'

// Pick a schema or skip validation
function selectValidator(pick: (ctx: Context) => ValidationSchema | undefined): MiddlewareFn {
  const cache = new Map<ValidationSchema, MiddlewareFn>()
  return async (ctx: Context, next) => {
    const schema = pick(ctx)
    if (schema === undefined) {
      return await next()
    }
    let validator = cache.get(schema)
    if (validator === undefined) {
      // Build once, reuse on later requests
      validator = Validator.check(schema)
      cache.set(schema, validator)
    }
    return await validator(ctx, next)
  }
}
```

Returning `undefined` calls `next` straight away, so the request flows through untouched. Returning a schema runs the matching [Validator Middleware](/middleware/validation/validator-middleware) before the handler.

## Wiring It To A Prefix

The picker reads `ctx.get.pathname()` and the request method to decide. Here the `body` contract runs only for the collection POST, and the GET passes through to validate its param in the handler:

```typescript twoslash
import { type Context, type MiddlewareFn, Router, Validator, type ValidationSchema } from '@neabyte/deserve'

declare function selectValidator(pick: (ctx: Context) => ValidationSchema | undefined): MiddlewareFn

const router = new Router({ routes: { directory: './routes' } })

const createTransfer = {
  body: Validator.define((body: { amount: number }) => ({ amount: body.amount }))
}
// ---cut---
// Validate body only on collection POST
router.use(
  '/transfers',
  selectValidator((ctx) =>
    ctx.get.pathname() === '/transfers' && ctx.get.method() === 'POST'
      ? createTransfer
      : undefined
  )
)
```

The `GET /transfers/:id` handler then validates its own param with a direct contract call, the approach from [Reading Validated Data](/middleware/validation/reading-data#checking-params-in-a-handler). Body validation and param validation stay separate, each firing only where it belongs.

## Picking Between Several Schemas

The same picker handles more than one branch when a prefix hosts many methods. Each branch returns the schema for that case, and anything unmatched returns `undefined`:

```typescript twoslash
import { type Context, type MiddlewareFn, Router, Validator, type ValidationSchema } from '@neabyte/deserve'

declare function selectValidator(pick: (ctx: Context) => ValidationSchema | undefined): MiddlewareFn

const router = new Router({ routes: { directory: './routes' } })

const listQuery = { query: Validator.define((q: Record<string, string>) => ({ page: Number(q['page'] ?? '1') })) }
const createBody = { body: Validator.define((body: { name: string }) => ({ name: body.name.trim() })) }
// ---cut---
// One picker, one schema per method
router.use(
  '/users',
  selectValidator((ctx) => {
    const isCollection = ctx.get.pathname() === '/users'
    if (isCollection && ctx.get.method() === 'GET') {
      return listQuery
    }
    if (isCollection && ctx.get.method() === 'POST') {
      return createBody
    }
    return undefined
  })
)
```

This keeps one validator registration per prefix while each method gets the exact schema it needs.

## Order Of Validation

Knowing what fails first makes a 422 predictable. Two rules cover every case, one for sources and one for guards.

A schema with several sources validates them in the order the keys appear, and the first source that fails stops the rest. A schema of `{ query, headers, cookies }` with a bad query and a missing header reports only the query reason, since `query` comes first and the header contract never runs:

![Source order across a schema: a bad query contract throws first and reports only the query reason, while the headers and cookies contracts that come after it in key order never run](/diagrams/validation-source-order.png)

```typescript twoslash
import { Validator } from '@neabyte/deserve'

// Sources validate in key order
const listAccounts = {
  query: Validator.define((q: Record<string, string>) => q),
  headers: Validator.define((h: Record<string, string>) => h),
  cookies: Validator.define((c: Record<string, string>) => c)
}
```

Within one source, the contract decides how much it reports. A single guard that pushes into a reasons array surfaces every broken field at once, while a list of guards stops at the first failure. That split comes straight from [Define Schema](/middleware/validation/define-schema#composing-several-guards), so a shape guard can report all missing fields while a later invariant guard only runs once the shape holds.

The result reads cleanly. Across sources the first failure wins, inside a source the contract chooses one reason or many, and across guards the first failing guard wins.

## Structuring Schemas

Contracts do not have to live next to the routes that use them. As a project grows, a folder of its own keeps each contract small and lets several routes share the same rule. A layout that scales tends to look like this:

```
schemas/
  _shared.ts    # small guard helpers reused across contracts
  transfer.ts   # one resource, its contracts
  account.ts
  index.ts      # barrel that groups contracts into schemas
routes/
  transfers.ts
  accounts.ts
```

The barrel groups single contracts into the per-source schemas a route reads, so the wiring stays in one place:

```typescript twoslash
import { Validator } from '@neabyte/deserve'
declare const Transfer: ReturnType<typeof Validator.define>
declare const AccountQuery: ReturnType<typeof Validator.define>
declare const ApiKeyHeader: ReturnType<typeof Validator.define>
// ---cut---
// schemas/index.ts groups contracts per source
export const createTransferSchema = {
  body: Transfer
}

export const listAccountsSchema = {
  query: AccountQuery,
  headers: ApiKeyHeader
}
```

A route imports only the schema type it needs, which keeps the handler focused on the response rather than the rules:

```typescript twoslash
import { type Context, Validator } from '@neabyte/deserve'
const createTransferSchema = { body: Validator.define((body: { amount: number }) => ({ amount: body.amount })) }
// ---cut---
// routes/transfers.ts reads the validated body
export function POST(ctx: Context): Response {
  const { body } = ctx.get.validated<typeof createTransferSchema>()
  return ctx.send.json({ amount: body.amount }, { status: 201 })
}
```

This is a suggestion, not a rule. A tiny app keeps contracts inline beside the route, and a larger one splits them out once a contract earns reuse.

## Where To Go Next

- [Validator Middleware](/middleware/validation/validator-middleware) - the per-source registration this pattern wraps
- [Reading Validated Data](/middleware/validation/reading-data) - validate params in the handler beside this pattern
- [Route-Specific Middleware](/middleware/route-specific) - the prefix matching rule behind it
- [Validation Overview](/middleware/validation/overview) - how the pieces fit together
