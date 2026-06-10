---
description: "Why Deserve has no pretty JSON option, since formatting is the consumer's job and the wire stays minified."
---

# Pretty JSON

Deserve has no pretty JSON option, and [`ctx.send.json()`](/response/json) always sends a minified body. Indentation is a reading aid, and reading happens on the consumer side, not on the wire.

## Why It Is Not Built In

A pretty JSON feature indents the response body, often behind a `?pretty` query, so the output is easier to read by eye. The cost lands on every response. The extra spaces and newlines add bytes to send and work to produce, and a large payload pays that tax on each request for a comfort the server never benefits from.

The reader already has better tools. A browser, [`curl`](https://curl.se/) piped to [`jq`](https://jqlang.org/), Postman, and every editor format JSON on demand, so the indentation is one keystroke away wherever the data is actually looked at. Sending it pre-indented from the server formats nothing the consumer could not format itself, while charging bandwidth for it.

## The Wire Stays Minified

`ctx.send.json()` builds the response through the platform's [`Response.json`](https://developer.mozilla.org/en-US/docs/Web/API/Response/json_static), which serializes with no indentation. The body is compact by default, with nothing to switch off.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Compact body, no extra whitespace
  return ctx.send.json({
    id: 1,
    name: 'Alice'
  })
}
```

This pairs with [compression](/by-design/compress). A minified body is already small, and the runtime compresses it further, so the bytes on the wire stay as lean as the data allows. Pretty printing would push in the opposite direction, inflating the body right before it gets compressed.

## When Indented Output Is Wanted

For a case that genuinely needs an indented body, such as a file a human downloads and opens, the formatting is explicit and local rather than a global mode. Build the string with `JSON.stringify` and send it as text.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Indent on purpose for this route
  const body = JSON.stringify(
    {
      id: 1,
      name: 'Alice'
    },
    null,
    2
  )

  // Send as text, keep JSON type
  return ctx.send.text(body, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}
```

The indentation is a choice made for one response, not a default the whole API carries. See [text responses](/response/text) for the helper used here and [JSON responses](/response/json) for the compact default.
