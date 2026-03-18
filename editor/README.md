# Editor Tooling

Editor support for Deserve, including syntax highlighting for Deserve View Engine (DVE) templates.

## Table of Contents

- [DVE (Deserve View Engine)](#dve-deserve-view-engine)
- [Example: Use DVE in Deserve](#example-use-dve-in-deserve)
  - [Project Structure](#project-structure)
  - [1) Add Templates](#1-add-templates)
  - [2) Configure Router](#2-configure-router)
  - [3) Render in a Route](#3-render-in-a-route)
- [Syntax Highlighting (Cursor / VS Code)](#syntax-highlighting-cursor--vs-code)

## DVE (Deserve View Engine)

DVE is Deserve's built-in view engine for rendering `.dve` templates.

## Example: Use DVE in Deserve

### Project Structure

```
.
├── main.ts
├── routes/
│   └── index.ts
└── views/
    ├── index.dve
    └── partials/
        └── header.dve
```

### 1) Add Templates

Create `views/index.dve`:

```txt
{{> partials/header.dve}}
Hello {{ user?.name ?? 'Guest' }}.
```

Create `views/partials/header.dve`:

```txt
<h1>Welcome</h1>
```

### 2) Configure Router

Enable DVE by setting `viewsDir` when you create the router.

```ts
import { Router } from '@neabyte/deserve'

const router = new Router({
  routesDir: './routes',
  viewsDir: './views'
})

await router.serve(8000)
```

### 3) Render in a Route

Create `routes/index.ts`:

```ts
import type { Context } from '@neabyte/deserve'

export async function GET(ctx: Context) {
  return await ctx.render('index', { user: { name: 'Nea' } })
}
```

Now run your server and open `http://localhost:8000`.

## Syntax Highlighting (Cursor / VS Code)

- **DVE syntax reference**: See [`editor/dve/README.md`](dve/README.md)
