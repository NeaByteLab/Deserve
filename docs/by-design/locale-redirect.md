---
description: "Why Deserve has no locale redirect middleware, since reading Accept-Language and redirecting is a few lines in a route."
---

# Locale Redirect

Deserve has no locale redirect middleware. Picking a language from the request and sending the visitor to the matching path is a short read of one header followed by a [redirect](/response/redirect), so it stays in the route that owns the decision.

## Why It Is Not Built In

A locale redirect inspects the visitor's preferred language and forwards a bare path like `/` to a localized one like `/en` or `/id`. Frameworks often ship this as middleware that runs on every request, which means one rule for the whole app and a redirect on paths that may not need one.

Language choice is a product decision, not a transport rule. Which locales exist, what the default is, and whether a cookie overrides the browser hint all differ per app. Leaving it in a route keeps that decision visible and easy to change, in line with [build on the platform](/core-concepts/philosophy#build-on-the-platform).

## Reading the Preference

The browser sends its language list in the [`Accept-Language`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Language) header, read through [`ctx.header`](/core-concepts/context-object#request-data-access). A small match against the locales the app supports gives the target, then [`ctx.send.redirect`](/response/redirect) sends the visitor there.

```typescript twoslash
import type { Context } from '@neabyte/deserve'
// ---cut---
export function GET(ctx: Context): Response {
  // Read the browser language hint
  const header = ctx.header('accept-language') ?? ''
  const supported = ['en', 'id']

  // Match a supported locale or default
  const preferred = header.split(',')[0]?.slice(0, 2) ?? 'en'
  const locale = supported.includes(preferred) ? preferred : 'en'

  // Send to the localized path
  return ctx.send.redirect(`/${locale}`, 302)
}
```

A 302 keeps the redirect temporary, so a later visit can still be matched again. For a fixed move that should be cached, [`ctx.send.redirect`](/response/redirect) accepts 301 and the other standard statuses.

## Sharing the Choice With Later Routes

When several routes need the resolved locale, middleware can resolve it once and store it in [`ctx.state`](/core-concepts/context-object#sharing-state) instead of redirecting, so each handler reads the same value.

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router()
// ---cut---
router.use(async (ctx, next) => {
  // Resolve locale once for the request
  const header = ctx.header('accept-language') ?? ''
  const preferred = header.split(',')[0]?.slice(0, 2) ?? 'en'

  // Share it with the route handlers
  ctx.state.locale = ['en', 'id'].includes(preferred) ? preferred : 'en'
  return await next()
})

await router.serve(8000)
```

The redirect form sends the visitor to a localized URL, while the state form keeps one URL and passes the locale inward. Both stay in plain route files, so the rule is where the language matters and nowhere else.
