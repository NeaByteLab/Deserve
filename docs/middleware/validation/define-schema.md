---
description: "Build request contracts with Validator.define, a transform paired with guards that reject bad input."
---

# Define Schema

> **Reference**: [Typebox GitHub Repository](https://github.com/NeaByteLab/Typebox)

A contract is a function that takes one input and returns a cleaned value. `Validator.define` builds one from two parts, a transform that shapes the output and optional guards that reject input before the transform runs.

## The Shape Of A Contract

`Validator.define(transform, guard?)` returns a contract:

```typescript twoslash
import { Validator } from '@neabyte/deserve'

// Transform only, no guard
const Trim = Validator.define((body: { name: string }) => ({
  name: body.name.trim()
}))
```

The transform normalizes the value, trimming strings, lowercasing an email, or coercing a number. It runs as the contract body once the input is trusted.

The transform also owns the output shape. A guard that passes does not strip extra keys, so unknown fields from the client survive unless the transform leaves them out. Returning a fresh object with only the wanted fields keeps surprise input out of the validated data:

```typescript twoslash
import { Validator } from '@neabyte/deserve'

// Output holds only the named fields
const NewUser = Validator.define((body: { name: string; role: string }) => ({
  name: body.name.trim()
}))
```

Here a client sending `role: 'admin'` finds it dropped, since the transform never copies it forward.

## Order Of Operations

A contract with at least one guard runs four steps in a fixed order, and the transform only ever sees input that cleared every guard:

1. A string input longer than 10000 characters is rejected before anything else.
2. An object input is deep frozen so a guard cannot mutate it.
3. Each guard runs in order, throwing on the first failure.
4. The transform runs and returns the cleaned value.

A contract built with no guard is a different shape entirely. `Validator.define(transform)` returns the transform untouched, so the string cap and the freeze never run and the raw input reaches the transform directly. A guardless transform must trust its input or do its own checks.

![Define order of operations: a guarded contract first caps string input at 10000 characters, then deep freezes an object so a guard cannot mutate it, then runs each guard in order throwing on the first failure, and only then runs the transform on input that cleared every guard, while a guardless contract returns the transform untouched so neither the cap nor the freeze runs](/diagrams/validation-contract-order.png)

## Guards Decide Pass Or Fail

A guard inspects the raw input and returns a verdict:

- `true` when the input passes.
- A `string` for a single failure reason.
- A `string[]` for several failure reasons at once.

![Guard verdicts: returning true sends the input on to the transform, while returning a string or a string array makes the contract throw and become a 422 with those reasons preserved on error.cause](/diagrams/validation-guard-verdict.png)

```typescript twoslash
import { Validator } from '@neabyte/deserve'

// Guard rejects an empty name
const NewUser = Validator.define(
  (body: { name: string }) => ({ name: body.name.trim() }),
  (body) => (body.name.trim().length > 0 ? true : 'name must not be empty')
)
```

A guard that returns reasons makes the contract throw, and the validator turns that throw into a 422 carrying those exact reasons. The path from a reason to a response lives in [Reading Validated Data](/middleware/validation/reading-data#how-failures-surface).

## Guarding The Shape First

A guard receives the raw input, which can be `null`, an array, or any JSON value a client sends. Reaching for a field on the wrong shape throws inside the guard before the rule even runs, so a shape check comes first:

```typescript twoslash
import { Validator } from '@neabyte/deserve'

// Confirm an object before reading fields
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

const NewUser = Validator.define(
  (body: { name: string }) => ({ name: body.name.trim() }),
  (body) => {
    if (!isRecord(body)) {
      return 'body must be a JSON object'
    }
    return typeof body['name'] === 'string' ? true : 'name must be a string'
  }
)
```

A throw inside a guard still becomes a 422, never a 500, so a missed shape check fails safe rather than crashing the request.

## Reporting Several Fields At Once

Returning an array reports every broken field in a single response instead of one at a time:

```typescript twoslash
import { Validator } from '@neabyte/deserve'

// Collect each failure into one array
const NewUser = Validator.define(
  (body: { name: string; age: number }) => body,
  (body) => {
    const reasons: string[] = []
    if (body.name.trim().length === 0) {
      reasons.push('name must not be empty')
    }
    if (body.age < 18) {
      reasons.push('age must be at least 18')
    }
    return reasons.length === 0 ? true : reasons
  }
)
```

## Composing Several Guards

The second argument also takes an array of guards. They run in order and the contract throws on the first one that fails, so later guards never see input that an earlier guard already rejected:

```typescript twoslash
import { Validator } from '@neabyte/deserve'

// Shape check first, business rule second
function hasFields(body: { from: string; to: string }): true | string {
  return body.from && body.to ? true : 'from and to are required'
}

function distinctAccounts(body: { from: string; to: string }): true | string {
  return body.from !== body.to ? true : 'from and to must differ'
}

const Transfer = Validator.define(
  (body: { from: string; to: string }) => body,
  [hasFields, distinctAccounts]
)
```

Splitting a shape check from a business rule keeps each guard small and lets the cross-field rule assume the fields already exist.

## Built-In Safety

The string cap and the freeze from [Order Of Operations](#order-of-operations) run as part of the guard step, so a guarded contract never burns time on a huge string and a guard never mutates the value it inspects. One more rule guards the timing model:

- An async guard is rejected, since validation stays synchronous and predictable.

These rules come from Typebox itself and protect any contract that carries a guard, whether it runs through the [Validator Middleware](/middleware/validation/validator-middleware) or a direct contract call in a handler. A guardless transform opts out of all three, so a contract that handles untrusted input should always carry at least one guard.

## Where To Go Next

- [Validator Middleware](/middleware/validation/validator-middleware) - wire contracts to request sources.
- [Reading Validated Data](/middleware/validation/reading-data) - read the transform output in a handler.
- [Advanced Patterns](/middleware/validation/advanced-patterns) - compose guards and order their failures.
- [Validation Overview](/middleware/validation/overview) - how the pieces fit together.
