---
description: "Hot reload in Deserve: how route and template changes are detected and applied without restarting the server."
---

# Hot Reload

Deserve automatically watches the `routesDir` and `viewsDir` directories for file changes, and when a file is created, modified, or deleted the server picks up the change on the next request with no restart required.

## Zero Configuration

Hot reload starts automatically when the server starts:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const app = new Router({
  routesDir: './routes',
  viewsDir: './views'
})

// Watchers start automatically
app.serve(3000)
```

## What Gets Watched

### Route Files

All files with supported extensions (`.ts`, `.js`, `.tsx`, `.jsx`, `.mjs`, `.cjs`) inside `routesDir` are watched recursively.

| Event             | Behavior                                                                     |
| ----------------- | ---------------------------------------------------------------------------- |
| **File created**  | Module is imported and route handlers are registered automatically           |
| **File modified** | Old handlers are removed, module is re-imported, new handlers are registered |
| **File deleted**  | Route pattern is removed from the router, requests return 404                |

### Template Files

All `.dve` files inside `viewsDir` are watched recursively, so [template](/rendering/) edits show on the next render without a restart.

| Event             | Behavior                                                                       |
| ----------------- | ------------------------------------------------------------------------------ |
| **File created**  | Discovered paths are refreshed so the template is available for rendering      |
| **File modified** | File cache and compiled AST cache are cleared, next render reads fresh content |
| **File deleted**  | Discovered paths are refreshed, rendering the template will throw an error     |

## Error Isolation

Bad files are caught, logged, and never crash the server or other routes. Each failure also surfaces as a [`route:error` or `reload:error`](/middleware/observability/events#routes) observability event, so logging stays in one place.

![An abstract view of why reloading stays safe, where applying a file change live rests on three mechanisms that hold together, isolating each file with a try catch so a bad one never crashes the others, busting the module cache with a timestamp query so stale code never contaminates the new, and reloading in sequence by removing then registering after a debounce, which together deliver live edits with no downtime, no crash, and no contamination](/diagrams/hot-reload-principles.png)

### Malformed Syntax

Invalid syntax fails the import and logs the error. Other routes stay unaffected:

```
[Deserve] Failed to reload route malformed.ts: The module's source code
could not be parsed: Expected ';', '}' or <eof> at ...
```

### Missing HTTP Method Exports

Routes without a valid HTTP method export (`GET`, `POST`, etc.) are rejected and logged:

```
[Deserve] Failed to reload route broken.ts: Route "broken.ts" must export
at least one HTTP method (DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT)
```

### Runtime Errors in Handlers

If a reloaded handler throws at request time, Deserve's [error handling](/error-handling/defense-in-depth) returns a proper 500 response. The server stays alive and other routes are unaffected.

## Debouncing

File system events are debounced to prevent redundant reloads during rapid saves:

- **Template watcher**: 100ms debounce, clears only the changed file's cache entries
- **Route watcher**: 150ms debounce, batches multiple file changes into a single sequential reload

Multiple file changes within the debounce window are batched into a single operation, avoiding redundant reloads when saving several files at once.

## How It Works

### Route Reloading

![The route reload sequence as the watcher runs it, where Deno.watchFs detects a change and debounces for 150ms, FastRouter.remove drops the old pattern, the module is re-imported with a timestamp query to bypass the cache, then it is validated for an HTTP method and its handlers register while emitting route:reloaded, and any failure in that step instead emits reload:error so the server stays alive and other routes are unaffected](/diagrams/hot-reload-route-sequence.png)

1. `Deno.watchFs` detects a change in `routesDir`
2. After the debounce window, the watcher resolves the file path to a route pattern
3. The old route pattern is removed from the router via `FastRouter.remove()`
4. The module is re-imported with a cache-busting query string (`?t=timestamp`) to bypass Deno's module cache
5. The module is validated and new HTTP method handlers are registered

### Template Reloading

1. `Deno.watchFs` detects a change in `viewsDir`
2. After the debounce window, the watcher clears the file's entry from `fileCache` (raw content) and `compileCache` (parsed AST)
3. The discovered template paths set is reset
4. On the next `render()` or `streamRender()` call, the engine re-reads the file from disk, re-parses it, and caches the result
