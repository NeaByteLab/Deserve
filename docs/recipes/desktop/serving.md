---
description: 'Serve the desktop UI from a Deserve router that binds the port the runtime assigns, render pages with the DVE view engine, and read the server address back from the environment.'
---

# Serving the UI

> **Reference**: [Deno Desktop HTTP Serving](https://docs.deno.com/runtime/desktop/serving/)

Inside a desktop bundle the page is a real web page served over HTTP, and Deserve is the server behind it. The window opens a webview, the webview requests `/` from a local port, and the [router](/getting-started/server-configuration) answers with rendered HTML. Every later request, an API call or a form post, travels the same loopback connection.

## How the Port Is Assigned

On a host, `router.serve(8000)` binds the port passed to it. Inside a desktop bundle the runtime picks a free loopback port first and passes it to the server through the `DENO_SERVE_ADDRESS` environment variable. Deserve reads that address when it binds, so the number in the source becomes a fallback rather than the final port.

The window navigates to the assigned port on its own, so the page loads without any extra wiring. The serve call still reads naturally:

```typescript twoslash
import { Router } from '@neabyte/deserve'

const base = import.meta.dirname

const router = new Router({
  routes: { directory: `${base}/routes` },
  views: { directory: `${base}/views` }
})
// ---cut---
// Runtime overrides this port in a bundle
await router.serve(8000, '127.0.0.1')
```

## Finding the Port

A route that needs to report the live server address reads `DENO_SERVE_ADDRESS` and takes the port from it. The variable holds a `host:port` string, so the port is the last segment:

```typescript twoslash
import type { Context } from '@neabyte/deserve'

// routes/api/system.ts
export function GET(ctx: Context): Response {
  // Read the port the runtime assigned
  const serverAddress = Deno.env.get('DENO_SERVE_ADDRESS')
  const port = serverAddress ? serverAddress.split(':').pop() : '8000'
  return ctx.send.json({
    server: `http://127.0.0.1:${port}`
  })
}
```

Reading the variable is what the `--allow-env` flag from [Building the App](/recipes/desktop/getting-started#defining-the-tasks) covers.

## Rendering the Page

The view engine turns on the moment `views.directory` points at a templates folder, the same setup as on a host. A route then renders a template with [`ctx.render()`](/core-concepts/context-object), and the rendered HTML is the page the window shows:

```typescript twoslash
import type { Context } from '@neabyte/deserve'

// routes/index.ts
export async function GET(ctx: Context): Promise<Response> {
  // Render the home template with data
  return await ctx.render('index', {
    appName: 'Deserve Desktop',
    version: '0.1.0'
  })
}
```

The template itself is a [DVE](/rendering/syntax) file. A layout holds the shell, including a styling link such as a CSS CDN, and the page extends it. The [view engine guide](/rendering/) covers the layout and block syntax, so the desktop side only has to point `views.directory` at the folder and call `render`.

## Talking Back to the Server

Browser JavaScript inside the window cannot touch the disk or the OS, since a webview is sandboxed like any browser. What it can do is call the server, which runs with Deno's permissions. A button that saves data posts to an API route, and the route writes the file:

```typescript twoslash
// Page side, runs inside the webview
async function saveNote(text: string): Promise<void> {
  // Post to the local API route
  await fetch('/api/note', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text })
  })
}
```

```typescript twoslash
import type { Context } from '@neabyte/deserve'

// routes/api/note.ts
export async function POST(ctx: Context): Promise<Response> {
  // Read the typed JSON request body
  const requestBody = await ctx.get.body<{ text?: string }>()
  const homeDir = Deno.env.get('HOME') ?? '.'
  // Write the note to the home folder
  await Deno.writeTextFile(`${homeDir}/.note.txt`, requestBody?.text ?? '')
  return ctx.send.json({ ok: true })
}
```

This page-to-server HTTP call is the backbone of a Deserve desktop app, and it is the same shape whether the server runs on a host or in a window. The reasons it stands in for the native binding channel are in [Bindings and the HTTP Bridge](/recipes/desktop/bindings).

## Detecting Desktop Mode

A page sometimes needs to know whether it runs in a window or a plain browser tab. [`Deno.desktopVersion`](https://docs.deno.com/api/deno/~/Deno.desktopVersion) carries a version string inside a desktop bundle and is undefined elsewhere, so a system route can report it and the page can branch on the value:

```typescript twoslash
import type { Context } from '@neabyte/deserve'

// deno-lint-ignore no-explicit-any
const D = Deno as any

export function GET(ctx: Context): Response {
  return ctx.send.json({
    // Non-null only inside a desktop bundle
    desktopVersion: D.desktopVersion ?? null
  })
}
```

Reading the value over the API keeps the check on the server, where it belongs, and leaves the page free of any native lookup. The native window itself, along with the menus and tray that surround this server, is the subject of [Windows, Menus, Tray and Dialogs](/recipes/desktop/native-apis).
