---
description: 'Ship a Deserve server to production with the right Deno permission flags, a locked-down run command, and a standalone compiled binary.'
---

# Production Deploy

Deno runs with [no permissions by default](https://docs.deno.com/runtime/fundamentals/security/), so a production server only gets the access it is handed on the command line. A Deserve server needs a small, predictable set of flags, and the same [Deno CLI](https://docs.deno.com/runtime/reference/cli/) that runs it locally also compiles it into one standalone binary for the deploy.

## Permission Checklist

A Deserve server touches the network to bind its port and the disk to read routes, views, and static files. That maps to three flags, with the rest staying off unless an app reaches for them:

| Flag             | Why Deserve needs it                                          | Required          |
| ---------------- | ------------------------------------------------------------ | ----------------- |
| `--allow-net`    | Binds the port through `Deno.serve` and powers any `fetch`   | Yes               |
| `--allow-read`   | Resolves the routes folder, views, and static files on disk  | Yes               |
| `--allow-env`    | Reads the `PORT` variable when the port comes from the host  | Only with env     |
| `--allow-write`  | Not used by the framework, only by an app that saves files   | Only when writing |

The write permission stays off for a plain server. A route that saves an upload to disk is the common reason to add it, scoped to one folder as shown in [File Uploads](/recipes/file-upload#saving-to-disk).

## Locking Permissions Down

A `*` permission works while building, yet production reads better when each flag names exactly what it may touch. Scoping `--allow-read` to the asset folders and `--allow-env` to the one variable keeps the surface small:

```bash
# Scope each permission to what it needs
deno run \
  --allow-net \
  --allow-read=./routes,./views,./public \
  --allow-env=PORT \
  main.ts
```

A [`deno task`](https://docs.deno.com/runtime/reference/cli/task/) in `deno.json` saves the long command and gives the deploy one name to call:

```json
{
  "tasks": {
    "start": "deno run --allow-net --allow-read=./routes,./views,./public --allow-env=PORT main.ts"
  }
}
```

Running `deno task start` then launches the server with the locked-down flags every time.

## Reading the Port From the Environment

A host usually assigns the port through a `PORT` variable. Calling `serve()` with no port reads `PORT` first and falls back to `8000`, so the same binary fits a local run and a managed host:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const router = new Router({
  routes: { directory: './routes' }
})
// ---cut---
// Reads PORT env, defaults to 8000
await router.serve()
```

Reading the variable is what `--allow-env=PORT` covers. Passing an explicit number like `serve(8000)` skips the lookup, so the env flag drops off when the port is hardcoded. The full host and signal arguments live in [Graceful Shutdown](/recipes/graceful-shutdown).

## Compiling a Standalone Binary

[`deno compile`](https://docs.deno.com/runtime/reference/cli/compile/) bakes the server and its permissions into a single executable that runs without Deno installed, which suits a slim container or a bare host. The permission flags belong on the compile command so the binary carries them:

```bash
# Bake server and flags into binary
deno compile \
  --allow-net \
  --allow-read=./routes,./views,./public \
  --allow-env=PORT \
  --output server \
  main.ts
```

The result runs straight from `./server` with the flags already inside. One caveat fits Deserve, since [hot reload](/core-concepts/hot-reload) watches files on disk and a compiled binary serves a fixed snapshot, so edits after the build need a fresh compile rather than a live swap.

## Watching It Run

Production needs eyes on the server without a console full of prints, which is what the [observability event bus](/middleware/observability/overview) is for. A single [`router.on()`](/middleware/observability/events) listener forwards lifecycle, request, and fault events to whatever collects logs, and [error reporting](/middleware/observability/errors) routes failures to the same place. A clean stop on deploy is covered by [Graceful Shutdown](/recipes/graceful-shutdown), and offloading heavy work without blocking the server is covered by the [worker pool](/recipes/worker-pool).
