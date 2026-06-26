---
description: "Read typed validated data with ctx.get.validated, check params in a handler, and see how failures map to 422."
---

# Reading Validated Data

The handler reads what the validator produced. `ctx.get.validated()` returns the stored output for a schema, and a direct contract call validates a value on the spot.

## Reading Stored Output

`ctx.get.validated()` returns the validated data keyed by source. The types come from the schema definition, so the handler gets full type safety for every field:

```typescript twoslash
import { type Context, Validator } from '@neabyte/deserve'

const createUser = {
  body: Validator.define((body: { name: string }) => ({ name: body.name.trim() }))
}
// ---cut---
export function POST(ctx: Context): Response {
  // Typed output, already validated
  const { body } = ctx.get.validated<typeof createUser>()
  return ctx.send.json({ created: body.name })
}
```

The shape mirrors the schema, so a schema with `query` and `headers` returns both keys with their own contract output types. The middleware that stored this data is covered in [Validator Middleware](/middleware/validation/validator-middleware).

## Reading Without A Validator Throws

`ctx.get.validated()` expects the [Validator Middleware](/middleware/validation/validator-middleware) to have run first. Calling it with no validated data throws `Deno.errors.NotSupported`, since reaching a read with nothing stored means the middleware was never registered. This is a wiring mistake in the code, not bad input from a client, so the framework maps it to a **501 Not Implemented** through the same [error handling](/error-handling/object-details) path that maps every other thrown error.

## Checking Params In A Handler

Route params resolve after middleware runs, so the [Validator Middleware](/middleware/validation/validator-middleware) does not accept a `params` source. The handler validates them directly by calling the contract function:

```typescript twoslash
import { type Context, Validator } from '@neabyte/deserve'

const UserId = Validator.define(
  (params: Record<string, string>) => ({ id: Number(params['id']) }),
  (params) => (/^\d+$/.test(params['id'] ?? '') ? true : 'id must be numeric')
)
// ---cut---
export function GET(ctx: Context): Response {
  // Validate the matched route param
  const { id } = UserId(ctx.get.param())
  return ctx.send.json({ id })
}
```

Calling a contract directly returns the transform output when the value passes and throws when it fails, the same throw the middleware produces. It works for any value, not only params, which makes it handy for validating a slice of data mid-handler.

## How Failures Surface

A contract that rejects its input throws, and the framework maps that throw to a status:

- An error that already carries a status passes through unchanged
- An error carrying failure reasons becomes a **422 Unprocessable Content**, with the reasons preserved on `error.cause` as a string array
- Any other throw from client input becomes a generic **422**

Client input never turns into a 500. That guarantee keeps a malformed body, a bad query string, or a thrown guard on the client side of the status line where it belongs.

![How a validation throw maps to a status: an error that already carries a status passes through, an error with reasons becomes a 422 keeping those reasons, any other client throw becomes a generic 422, and reading with no validator registered throws Deno.errors.NotSupported that maps to a 501 because that signals a wiring mistake rather than bad input](/diagrams/validation-failure-status.png)

The reasons ride on `error.cause`, so a custom handler reads them and replies with field-level detail. Error shaping is centralized in [Object Details](/error-handling/object-details), the single `router.catch` that handles validation alongside every other error:

```typescript twoslash
import { type HttpStatusCode, Router } from '@neabyte/deserve'

const router = new Router({
  routes: { directory: './routes' }
})
// ---cut---
router.catch((ctx, info) => {
  // Pull validation reasons off the cause
  const reasons = Array.isArray(info.error.cause)
    ? info.error.cause.filter((reason): reason is string => typeof reason === 'string')
    : []
  return ctx.send.json(
    { error: 'request_failed', status: info.statusCode, reasons },
    { status: info.statusCode as HttpStatusCode }
  )
})
```

For the full `ErrorInfo` object and the default response when no handler is set, see [Object Details](/error-handling/object-details) and [Default Behavior](/error-handling/default-behavior). Validation faults also flow through the observability bus as `validate:failed` events, so a listener can record them, covered in [Error Reporting](/middleware/observability/errors).

## Where To Go Next

- [Define Schema](/middleware/validation/define-schema) - write the contracts behind the reads
- [Object Details](/error-handling/object-details) - shape the response a failure produces
- [Advanced Patterns](/middleware/validation/advanced-patterns) - validate params beside a body validator
- [Validation Overview](/middleware/validation/overview) - how the pieces fit together
