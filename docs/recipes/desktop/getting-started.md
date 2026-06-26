---
description: 'Set up the desktop block in deno.json, compile a Deserve server into a native bundle, embed the routes and views, and resolve template paths against the bundle instead of the working directory.'
---

# Building the App

> **Reference**: [Deno Desktop CLI](https://docs.deno.com/runtime/desktop/)

A desktop build starts from an ordinary Deserve project, the kind from [Quick Start](/getting-started/quick-start), and adds a `desktop` block to `deno.json` plus a couple of build flags. The server code stays the same. The compile step bakes that server, the routes, the views, and a rendering backend into one application bundle.

## The Desktop Block

Configuration for `deno desktop` lives in a `desktop` block inside `deno.json`. A minimal block names the app and picks the rendering backend, while the root `name` and `version` fields feed the bundle metadata:

```json
{
  "name": "deserve-desktop",
  "version": "0.1.0",
  "imports": {
    "@neabyte/deserve": "jsr:@neabyte/deserve@0.15.0"
  },
  "desktop": {
    "app": {
      "name": "Deserve Desktop",
      "identifier": "com.example.deservedesktop"
    },
    "backend": "webview"
  }
}
```

The `app.identifier` is a reverse-DNS string. It feeds the macOS bundle id, the Linux desktop entry, and the Windows app id, and a stable value here is what lets [notifications](/recipes/desktop/notifications-updates#notifications) ask for permission. The `backend` choice and the rest of the block are covered in [Backends and Distribution](/recipes/desktop/distribution).

## Defining the Tasks

A [`deno task`](https://docs.deno.com/runtime/reference/cli/task/) saves the long build command. The `--include` flags matter most, since the routes and views folders are read at runtime and have to ride inside the bundle:

```json
{
  "tasks": {
    "desktop": "deno desktop --allow-net --allow-read --allow-env --allow-write --include routes --include views main.ts"
  }
}
```

Each permission flag carries into the bundle, the same set a [production deploy](/recipes/production-deploy#permission-checklist) uses. Running `deno task desktop` then compiles the app for the host platform.

## Embedding Routes and Views

Without `--include`, the compile step bakes in `main.ts` and the modules it imports, but not the route and view folders that Deserve reads from disk at request time. The build output shows what made it in:

```
Embedded Files
DeserveDesktop.dylib
├── main.ts
├── routes/*
└── views/*
```

When the routes and views are missing from that list, the running app answers every request with a 404, since the router scans an empty folder. Adding `--include routes --include views` puts both folders in the embedded virtual filesystem, where the router finds them at runtime.

## The Working Directory Trap

A compiled bundle runs with the current working directory set to wherever the user launched it, not the folder that holds the binary. A relative path like `./routes` then resolves against the user's location and points at nothing. The page renders a 404 even though the folders were embedded.

The fix anchors the paths to the module instead of the working directory. [`import.meta.dirname`](https://docs.deno.com/api/web/~/ImportMeta) holds the absolute folder of the current module, so joining the route and view folders to it resolves the same way on a host and inside a bundle:

```typescript twoslash
import { Router } from '@neabyte/deserve'

// Anchor paths to this module folder
const base = import.meta.dirname

const router = new Router({
  routes: { directory: `${base}/routes` },
  views: { directory: `${base}/views` }
})

await router.serve(8000, '127.0.0.1')
```

Binding `127.0.0.1` keeps the server on loopback, which is the only interface a desktop app needs. The port argument is a starting point, since the desktop runtime hands the server a port of its own, a detail covered in [Serving the UI](/recipes/desktop/serving#finding-the-port).

## First Run

After `deno task desktop` finishes, the bundle lands next to the project. Launching it opens the window and the page loads from the embedded server:

```bash
# Open the freshly built bundle
open "Deserve Desktop.app"
```

The same entry file also runs on a host with `deno run`, since the native pieces stay dormant when no window exists. That dual path is what the [native API guards](/recipes/desktop/native-apis#staying-dual-mode) rely on, and it keeps browser-based development fast while the desktop build stays one command away.
