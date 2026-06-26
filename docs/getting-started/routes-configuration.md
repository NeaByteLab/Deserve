---
description: "Configure the routes directory, parameter limits, and request timeouts in the Deserve Router."
---

# Routes Configuration

Configure the Deserve routes directory to match the project structure. Every option lives on the `RouterOptions` object passed to `new Router(...)`.

## Router Options

The `Router` constructor accepts one options object. The everyday pair is `routes.directory` for the route folder and `timeoutMs` for a request deadline. The sections below cover route loading, request size limits, template render limits, and the two advanced hooks `trustProxy` and `worker`. Two related options live on their own pages, `trustProxy` under [Client IP Resolution](/getting-started/server-configuration#client-ip-resolution) and the `worker` pool under [Worker Pool](/recipes/worker-pool).

```typescript twoslash
import { Router } from '@neabyte/deserve'

// Custom routes folder and timeout
const router = new Router({
  routes: {
    directory: './src/routes'
  },
  timeoutMs: 30_000
})
```

## routes

### `routes.directory`

The directory containing the route files. Defaults to `./routes`:

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
// Defaults to ./routes
const defaultRouter = new Router()

// Read routes from ./src/api
const router = new Router({
  routes: {
    directory: './src/api'
  }
})
```

### `routes.maxParamLength`

Maximum length of a single route parameter value. A longer value is rejected with **414 URI Too Long**. The default is `1024`:

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  routes: {
    directory: './routes',
    maxParamLength: 512
  }
})
```

## views

### `views.directory`

The directory containing DVE template files. Defaults to `./views`. When omitted, `ctx.render()` throws because no view engine is configured:

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  routes: {
    directory: './routes'
  },
  views: {
    directory: './views'
  }
})
```

### `views.maxIterations`

Maximum iterations allowed per <code v-pre>{{#each}}</code> block in DVE templates. The cap prevents event loop starvation from one unbounded loop. The default is `100_000`, and exceeding it makes the engine throw so the server responds with **400 Bad Request**.

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  routes: {
    directory: './routes'
  },
  views: {
    directory: './views',
    maxIterations: 50_000
  }
})
```

For datasets larger than the limit, use [`ctx.render`](/core-concepts/context-object#rendering-templates) with `stream: true` instead, and see [Performance and Limits](/rendering/performance#iteration-limit) for how the cap behaves. For CPU-intensive rendering, consider offloading to a [worker pool](/recipes/worker-pool).

### `views.maxRenderIterations`

Maximum total <code v-pre>{{#each}}</code> body executions across one render, summed over every loop including nested ones. Where `maxIterations` guards a single loop, this guards the whole page. The default is `1_000_000`, and exceeding it responds with **400 Bad Request**.

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  routes: {
    directory: './routes'
  },
  views: {
    directory: './views',
    maxRenderIterations: 500_000
  }
})
```

### `views.maxOutputSize`

Maximum total output characters produced by one render. The cap stops a small template from expanding into a huge response. The default is `5_000_000`, and exceeding it responds with **400 Bad Request**.

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  routes: {
    directory: './routes'
  },
  views: {
    directory: './views',
    maxOutputSize: 1_000_000
  }
})
```

### `views.maxTemplateSize`

Maximum size of a single template file in characters. The cap stops an oversized template from consuming memory before it ever compiles. The default is `1_000_000`, set by the [DVE engine](https://jsr.io/@neabyte/dve), and exceeding it responds with **400 Bad Request**. The same cap applies to every included or layout file the engine resolves.

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  routes: {
    directory: './routes'
  },
  views: {
    directory: './views',
    maxTemplateSize: 500_000
  }
})
```

## maxUrlLength

Maximum length of the request URL in characters. A longer URL is rejected with **414 URI Too Long** before any route runs. The default is `8192`:

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  maxUrlLength: 4096
})
```

## timeoutMs

Optional timeout in milliseconds for the full request (middleware + route handler). If exceeded, the server responds with **503 Service Unavailable**. Omit or leave undefined for no timeout. See also [Server Configuration](/getting-started/server-configuration#request-timeout):

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  routes: {
    directory: './routes'
  },
  timeoutMs: 30_000
})
```

## hotReload

Enables or disables file watching for routes and views. Defaults to `true`. Set to `false` to disable [hot reload](/core-concepts/hot-reload) entirely, which suits production deployments where file watching is unnecessary:

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  hotReload: false
})
```

## trustProxy

Controls how the real client IP is resolved behind a proxy or load balancer. See [Client IP Resolution](/getting-started/server-configuration#client-ip-resolution) for the full guide.

## worker

Configures a worker pool for offloading CPU-bound work. See [Worker Pool](/recipes/worker-pool) for the full guide.

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
  routes: {
    directory: './routes'
  }
})
```

### Absolute Paths

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  routes: {
    directory: `${Deno.cwd()}/routes`
  }
})
```

```typescript twoslash
import { Router } from '@neabyte/deserve'
// ---cut---
const router = new Router({
  routes: {
    directory: '/absolute/path/to/routes'
  }
})
```
