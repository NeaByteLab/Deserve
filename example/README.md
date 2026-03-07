# Example Implementation

This folder is reserved for **implementation examples** using [Deserve](https://github.com/neabytelab/deserve).

## Showcase

- **[Deserve-React](https://github.com/NeaByteLab/Deserve-React)** — Deserve + React with Vite SSR. File-based routes, cookie session, in-memory CRUD demo. Clone, `deno install`, `deno task build`, then `deno task start`; open http://localhost:8000.
- **[Restful-API](https://github.com/NeaByteLab/Restful-API)** — RESTful API built with Deno, Deserve, and [Jsonary](https://jsr.io/@neabyte/jsonary) (file-based JSON DB). Full CRUD (users resource), quick setup under 5 minutes. Clone, `deno task start`, then hit `GET/POST/PUT/DELETE /users` and `/users/:id`.

## Where to Start

- **[Quick Start](../docs/en/getting-started/quick-start.md)** — Run your first server and route.
- **[Examples (Docs)](../docs/en/examples.md)** — Example use cases and pointers.
- **Project Root** — Use `import { Router, Mware } from '@neabyte/deserve'` and see the main [README](../README.md) for setup.

More example code and sample apps will be added as the project grows.
