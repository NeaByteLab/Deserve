---
description: "Configure the routes directory, parameter limits, and request timeouts in the Deserve Router."
---

# Routes Configuration

Configure the Deserve routes directory to match the project structure.

## Router Options

The `Router` constructor accepts one options object. The everyday pair is `routesDir` for the route folder and `requestTimeoutMs` for a request deadline. The sections below cover route loading, request size limits, template render limits, and the two advanced hooks `errorResponseBuilder` and `staticHandler`. Two related options live on their own pages, `trustProxy` under [Client IP Resolution](/getting-started/server-configuration#client-ip-resolution) and the `worker` pool under [Worker Pool](/core-concepts/worker-pool).

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

Maximum iterations allowed per <code v-pre>{{#each}}</code> block in DVE templates. The cap prevents event loop starvation from one unbounded loop. The default is `100_000`, and exceeding it makes the engine throw so the server responds with **400 Bad Request**.

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

### `maxRenderIterations`

Maximum total <code v-pre>{{#each}}</code> body executions across one render, summed over every loop including nested ones. Where `maxIterations` guards a single loop, this guards the whole page. The default is `1_000_000`, and exceeding it responds with **400 Bad Request**.

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  routesDir: 'routes',
  viewsDir: './views',
  maxRenderIterations: 500_000
})
```

### `maxOutputSize`

Maximum total output characters produced by one render. The cap stops a small template from expanding into a huge response. The default is `5_000_000`, and exceeding it responds with **400 Bad Request**.

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  routesDir: 'routes',
  viewsDir: './views',
  maxOutputSize: 1_000_000
})
```

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
      errorMiddleware: ErrorMiddleware | null
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

### `staticHandler`

Advanced option that replaces how static files are served. It receives the context, the [static options](/static-file/basic#static-file-options) for the matched route, and the URL path, then returns the `Response`. The default implementation already guards path traversal, so override it only for a custom backend such as object storage:

```typescript twoslash
import type { Context, ServeOptions } from '@neabyte/deserve'
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  routesDir: 'routes',
  staticHandler: {
    // Serve files from a custom backend
    async serve(ctx: Context, options: ServeOptions, urlPath: string) {
      return ctx.send.text(`requested ${urlPath}`)
    }
  }
})
```

Register the static route itself with [`router.static()`](/static-file/basic), which this handler then fulfills.

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
