---
description: "Features Deserve leaves out on purpose, and how to compose them from the primitives that ship."
---

# By Design

Some features are missing from Deserve on purpose. Each absence here is a decision, not a gap waiting to be filled. The framework gives the primitives, and the shape of the feature is left to the developer who knows the use case best.

This section explains the reasoning behind each omission and shows how to compose the same behavior from parts that already ship. Every recipe leans on tools covered elsewhere in the docs, mainly [global middleware](/middleware/global), the [Context object](/core-concepts/context-object), and the [observability events](/middleware/observability/overview).

## What Lives Here

| Feature                                       | Why It Is Not Built In                                              |
| --------------------------------------------- | ------------------------------------------------------------------ |
| [Compression](/by-design/compress)           | The runtime and proxies already compress responses.                |
| [Pretty JSON](/by-design/pretty-json)         | Formatting is the consumer's job, so the wire stays minified.      |
| [HTTPS Redirect](/by-design/https-redirect)   | TLS belongs at the edge, and a forced redirect at the app can loop. |
| [Bearer Auth](/by-design/bearer-auth)         | Token schemes vary, so verification stays open to compose.         |
| [XSS Input Sanitizer](/by-design/xss)         | Escaping belongs at output, and the view engine already does it.   |
| [Caching](/by-design/cache)                   | Stateless sessions plus in-memory maps cover the need.             |
| [Rate Limiting](/by-design/rate-limit)        | Every team wants a different shape, composed with middleware.      |
| [Request ID](/by-design/request-id)           | The resolved client IP is the trustworthy identity, not a random ID. |
| [Method Override](/by-design/method-override) | Every HTTP method is a first-class route, so no verb to fake.      |
| [Locale Redirect](/by-design/locale-redirect) | Reading the language header and redirecting is a few lines.        |
| [Server-Timing](/by-design/server-timing)     | The lifecycle measures duration, and the header is one line.       |
| [Distributed Tracing](/by-design/tracing)     | No OpenTelemetry SDK, since OTel-aligned events feed any backend.  |

Each page follows the [philosophy](/core-concepts/philosophy) of staying small on purpose. Leaving a feature out is not a missing piece, it is one less thing that can go wrong, and the primitives that ship are enough to build the rest.
