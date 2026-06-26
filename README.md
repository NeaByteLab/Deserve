<div align="center">

# Deserve

Build HTTP server effortlessly with zero configuration for productivity.

[![Deno](https://img.shields.io/badge/deno-2.8.3+-000000?logo=deno&logoColor=white)](https://deno.com) [![JSR](https://jsr.io/badges/@neabyte/deserve)](https://jsr.io/@neabyte/deserve) [![CI](https://github.com/NeaByteLab/Deserve/actions/workflows/ci.yaml/badge.svg)](https://github.com/NeaByteLab/Deserve/actions/workflows/ci.yaml) [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

</div>

## Installation

> [!NOTE]
> **Prerequisites:** [Deno](https://deno.com/) 2.8.3 or later.

```bash
# Add Deserve from JSR
deno add jsr:@neabyte/deserve
```

See the [installation guide](https://docs-deserve.neabyte.com/getting-started/installation) for details.

## Quick Start

Create a routes directory and export HTTP method handlers. Start the server.

```typescript
import { Router } from '@neabyte/deserve'

// Create router pointing at routes directory
const router = new Router({ routes: { directory: './routes' } })

// Optional worker pool for CPU-bound work
// const router = new Router({
//   routes: { directory: './routes' },
//   worker: { scriptURL: import.meta.resolve('./worker.ts'), poolSize: 4 }
// })
// Read handle: ctx.get.worker()

// Start server on port 8000
await router.serve(8000)
```

**Example route** in `routes/hello.ts`:

```typescript
import type { Context } from '@neabyte/deserve'

// Export GET, POST, PUT, path from file location
export function GET(ctx: Context): Response {
  return ctx.send.json({ message: 'Hello from Deserve' })
}
```

- [Quick Start (Docs)](https://docs-deserve.neabyte.com/getting-started/quick-start)
- [File-Based Routing](https://docs-deserve.neabyte.com/core-concepts/file-based-routing)
- [Example Implementation](https://docs-deserve.neabyte.com/examples)

## Build & Test

From the repo root (requires [Deno](https://deno.com/)).

**Check** - format, lint, and typecheck:

```bash
# Format, lint, and typecheck source
deno task check
```

**Test** - run tests (under `tests/`, uses `--allow-read --allow-net`):

```bash
# Run tests in tests/ (uses --allow-read --allow-net)
deno task test
```

**Benchmark** - autocannon runs. [benchmark/README.md](benchmark/README.md) for details.

## Documentation

Full documentation (EN / ID): **[docs-deserve.neabyte.com](https://docs-deserve.neabyte.com)**

### DVE Editor (Syntax Highlighting)

- **Cursor / VS Code extension**: See [DVE Editor](https://github.com/NeaByteLab/DVE/tree/main/editor)

## Contributing

- **Bugs & ideas** - [GitHub Issues](https://github.com/NeaByteLab/Deserve/issues)
- **Code & docs** - [Pull Requests](https://github.com/NeaByteLab/Deserve/pulls) welcome.
- **Use it** - Try Deserve in real projects and share feedback.

## License

This project is licensed under the MIT license. See [LICENSE](LICENSE) for details.
