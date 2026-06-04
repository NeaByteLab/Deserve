# Hot Reload

Deserve automatically watches your `routesDir` and `viewsDir` directories for file changes. When a file is created, modified, or deleted, the server picks up the changes on the next request, no restart required.

## Zero Configuration

Hot reload starts automatically when the server starts:

```typescript
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

All `.dve` files inside `viewsDir` are watched recursively.

| Event             | Behavior                                                                       |
| ----------------- | ------------------------------------------------------------------------------ |
| **File created**  | Discovered paths are refreshed so the template is available for rendering      |
| **File modified** | File cache and compiled AST cache are cleared, next render reads fresh content |
| **File deleted**  | Discovered paths are refreshed, rendering the template will throw an error     |

## Error Isolation

Bad files are caught, logged, and never crash the server or other routes.

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

If a reloaded handler throws at request time, Deserve's error handling returns a proper 500 response. The server stays alive and other routes are unaffected.

## Debouncing

File system events are debounced to prevent redundant reloads during rapid saves:

- **Template watcher**: 100ms debounce, clears only the changed file's cache entries
- **Route watcher**: 150ms debounce, batches multiple file changes into a single sequential reload

Multiple file changes within the debounce window are batched into a single operation, avoiding redundant reloads when saving several files at once.

## How It Works

### Route Reloading

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
