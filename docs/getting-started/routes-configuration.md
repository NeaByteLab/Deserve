---
description: "Configure the routes directory, parameter limits, and request timeouts in the Deserve Router."
---

# Routes Configuration

Configure the Deserve routes directory to match the project structure.

## Router Options

The `Router` constructor accepts configuration options. The common ones are `routesDir` for the route folder and `requestTimeoutMs` for a request timeout. Rendering, request limits, worker pools, and a custom error builder are all configurable too. Proxy trust through `trustProxy` and the worker pool live in [Client IP Resolution](/getting-started/server-configuration#client-ip-resolution) and [Worker Pool](/core-concepts/worker-pool).

```typescript twoslash
import { Router } from '@neabyte/deserve'

// Custom routes folder and timeout
const router = new Router({
  routesDir: 'src/routes',
  requestTimeoutMs: 30_000
})
```

## Configuration Options

### `routesDir`

The directory containing the route files:

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
// Defaults to ./routes
const defaultRouter = new Router()

// Read routes from ./src/api
const router = new Router({
  routesDir: 'src/api'
})
```

### `requestTimeoutMs`

Optional timeout in milliseconds for the full request (middleware + route handler). If exceeded, the server responds with **503 Service Unavailable**. Omit or leave undefined for no timeout.

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  routesDir: 'routes',
  requestTimeoutMs: 30_000
})
```

### `maxIterations`

Maximum iterations allowed per <code v-pre>{{#each}}</code> block in DVE templates. The cap prevents event loop starvation from unbounded rendering. The default is `100_000`, and exceeding it makes the engine throw so the server responds with **500 Internal Server Error**.

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  routesDir: 'routes',
  viewsDir: './views',
  maxIterations: 50_000
})
```

For datasets larger than the limit, use [`streamRender`](/rendering/streaming) instead, and see [Performance and Limits](/rendering/performance#iteration-limit) for how the cap behaves. For CPU-intensive rendering, consider offloading to a [worker pool](/core-concepts/worker-pool).

### `maxUrlLength`

Maximum length of the request URL in characters. A longer URL is rejected with **414 URI Too Long** before any route runs. The default is `8192`:

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  routesDir: 'routes',
  maxUrlLength: 4096
})
```

### `maxParamLength`

Maximum length of a single route parameter value. A longer value is rejected with **414 URI Too Long**. The default is `1024`:

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  routesDir: 'routes',
  maxParamLength: 512
})
```

### `errorResponseBuilder`

Advanced option that replaces how error responses are built. It receives the context, status code, error, and the handler set with [`router.catch()`](/error-handling/object-details), and returns the final `Response`. Most apps shape errors through `router.catch()` instead, covered in [Error Handling](/error-handling/object-details):

```typescript twoslash
import type { Context, ErrorMiddleware } from '@neabyte/deserve'
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  routesDir: 'routes',
  errorResponseBuilder: {
    // Build a custom error response
    async build(
      ctx: Context,
      statusCode: number,
      error: Error,
      errorMiddleware?: ErrorMiddleware
    ) {
      return ctx.send.json(
        {
          failed: true,
          statusCode
        },
        { status: statusCode }
      )
    }
  }
})
```

## Supported File Extensions

Deserve automatically detects and supports these file extensions:

- `.ts` (TypeScript)
- `.js` (JavaScript)
- `.tsx` (TypeScript with JSX)
- `.jsx` (JavaScript with JSX)
- `.mjs` (ES Modules)
- `.cjs` (CommonJS)

No extra configuration is needed, since Deserve detects them automatically.

## Absolute vs Relative Paths

### Relative Paths

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  routesDir: 'routes'
})
```

### Absolute Paths

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  routesDir: `${Deno.cwd()}/routes`
})
```

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  routesDir: '/absolute/path/to/routes'
})
```
