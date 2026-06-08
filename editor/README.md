# Editor Tooling

Editor support for Deserve, including syntax highlighting for Deserve View Engine (DVE) templates.

## Table of Contents

- [DVE (Deserve View Engine)](#dve-deserve-view-engine)
- [Example: Use DVE in Deserve](#example-use-dve-in-deserve)
  - [Project Structure](#project-structure)
  - [1) Add Templates](#1-add-templates)
  - [2) Configure Router](#2-configure-router)
  - [3) Render in a Route](#3-render-in-a-route)
- [Syntax Highlighting (Cursor / VS Code / Trae)](#syntax-highlighting-cursor--vs-code--trae)

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

Enable DVE by setting `viewsDir` when the router is created.

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

Run the server and open `http://localhost:8000` to see the rendered page.

## Syntax Highlighting (Cursor / VS Code / Trae)

Deserve ships a local DVE extension package at `editor/dve/dve-language-0.1.0.vsix`.

Install it with an editor CLI:

```bash
# Trae
trae --install-extension ./dve/dve-language-0.1.0.vsix --force

# VS Code
code --install-extension ./dve/dve-language-0.1.0.vsix --force

# Cursor
cursor --install-extension ./dve/dve-language-0.1.0.vsix --force
```

After installing, reload the editor window and open any `.dve` file, where HTML stays the base syntax with the embedded DVE tags highlighted on top.

- **DVE syntax reference**: See [`editor/dve/README.md`](dve/README.md)
