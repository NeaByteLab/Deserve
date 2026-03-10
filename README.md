<div align="center">

# Deserve

Build HTTP server effortlessly with zero configuration for productivity.

[![Deno](https://img.shields.io/badge/deno-2.5.4+-000000?logo=deno&logoColor=white)](https://deno.com) [![JSR](https://jsr.io/badges/@neabyte/deserve)](https://jsr.io/@neabyte/deserve) [![CI](https://github.com/NeaByteLab/Deserve/actions/workflows/ci.yaml/badge.svg)](https://github.com/NeaByteLab/Deserve/actions/workflows/ci.yaml) [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

</div>

## Features

- **Zero Config** — No build step for the server. Point to a routes directory and serve.
- **File-Based Routing** — Drop files in `routes/`; export `GET`, `POST`, etc. File structure is your API.
- **Context** — Request wrapper: body (JSON/form/text), query, params, cookies, headers, `ctx.send`.
- **Middleware** — Global, path-specific. CORS, SecHeaders, Body Limit, Basic Auth, Session, WebSocket.
- **Static Files** — `router.static(urlPath, options)` with optional etag and cache-control.
- **Error Handling** — Pluggable error response builder and error middleware; default HTML/JSON by `Accept`.
- **Worker Pool** — Optional worker pool for CPU-bound work; enable via `worker: { scriptURL, poolSize }`.
- **Frontend Optional** — Use any stack (Vite, React, etc.); Deserve stays the server.

## Installation

> [!NOTE]
> **Prerequisites:** [Deno](https://deno.com/) 2.5.4 or later.

```bash
# Add Deserve from JSR
deno add jsr:@neabyte/deserve
```

See the [installation guide](https://docs-deserve.neabyte.com/en/getting-started/installation) for details.

## Quick Start

Create a routes directory and export HTTP method handlers. Start the server.

```typescript
import { Router } from 'jsr:@neabyte/deserve'

// Create router and point to your routes directory
const router = new Router({ routesDir: './routes' })

// Optional: enable worker pool for CPU-bound work (ctx.state.worker.run(payload) in routes)
// const router = new Router({
//   routesDir: './routes',
//   worker: { scriptURL: import.meta.resolve('./worker.ts'), poolSize: 4 }
// })

// Start server on port 8000
await router.serve(8000)
```

**Example route** — `routes/hello.ts`:

```typescript
import type { Context } from 'jsr:@neabyte/deserve'

// Export GET (or POST, PUT, etc.) — path comes from file location
export function GET(ctx: Context) {
  return ctx.send.json({ message: 'Hello from Deserve' })
}
```

- [Quick Start (Docs)](https://docs-deserve.neabyte.com/en/getting-started/quick-start)
- [File-Based Routing](https://docs-deserve.neabyte.com/en/core-concepts/file-based-routing)
- [Example Implementation](example/README.md)

## Build & Test

From the repo root (requires [Deno](https://deno.com/)).

**Check** — format, lint, and typecheck:

```bash
# Format, lint, and typecheck source
deno task check
```

**Test** — run tests (under `tests/`, uses `--allow-read` for fixtures):

```bash
# Run tests in tests/ (uses --allow-read for fixtures)
deno task test
```

**Benchmark** — performance runs with autocannon; see [benchmark/README.md](benchmark/README.md) for how to run and interpret results.

## Documentation

Full docs (EN / ID): **[docs-deserve.neabyte.com](https://docs-deserve.neabyte.com)**

- **Getting Started** — Installation, Quick Start, Server & Routes configuration
- **Core Concepts** — Philosophy, file-based routing, route patterns, Context, request handling
- **Middleware** — Global, route-specific, Basic Auth, Body Limit, CORS, Security Headers, WebSocket
- **Response** — JSON, text, HTML, file/data download, redirect, custom
- **Static Files** — Basic and multiple directories
- **Error Handling** — Default behavior, error object details

## Contributing

- **Bugs & ideas** — [GitHub Issues](https://github.com/NeaByteLab/Deserve/issues)
- **Code & docs** — [Pull Requests](https://github.com/NeaByteLab/Deserve/pulls) welcome; docs support English and Indonesian.
- **Use it** — Try Deserve in your projects and share feedback.

## License

This project is licensed under the MIT license. See [LICENSE](LICENSE) for details.
