---
description: 'Wrap a Deserve server in a native desktop window with deno desktop, where the framework serves the UI over local HTTP and the runtime handles windows, menus, and tray.'
---

# Deno Desktop Overview

> **Reference**: [Deno Desktop](https://docs.deno.com/runtime/desktop/)

A desktop build takes a Deserve server, the same routes and views that run on a host, and wraps it in a native window. [`deno desktop`](https://docs.deno.com/runtime/desktop/) compiles the server plus a rendering backend into one application bundle, then on launch it starts the server on a local loopback port and points a webview at it. The window shows a normal web page, the page talks to the server over HTTP, and the server reaches the disk and the OS through Deno.

This is the picture to keep in mind across the rest of this series:

```
DeserveDesktop.app (one bundle)
├── webview            → renders the page, runs browser JS
└── deno + deserve     → router.serve() on 127.0.0.1:<port>
        routes/*       → GET, POST handlers
        views/*        → DVE templates
```

The frontend and the backend live in the same process and the same file. The server binds loopback only, so nothing outside the machine can reach it. The result reads like a web app on the inside and a native app from the outside.

`deno desktop` is available starting in Deno **2.9.0** and is marked experimental, so the API surface can shift between releases.

## Why Deserve Fits

A desktop app still needs routing, a view engine, request handling, and an error path. Deserve already supplies all of that, so the desktop build reuses the server unchanged. The [router](/getting-started/server-configuration) serves the page and the API, [file-based routing](/core-concepts/file-based-routing) maps the endpoints, and the [view engine](/rendering/) renders the HTML. The native layer sits beside the server rather than replacing any of it.

One detail shapes everything else. The page and the Deno side talk over the local HTTP API, the same transport a browser would use, which keeps the server code identical whether it runs on a host or inside a window. The reasons behind that choice live in [Bindings and the HTTP Bridge](/recipes/desktop/bindings).

## Feature Compatibility

Most of the `deno desktop` surface works through Deserve without changes. A few items carry conditions, and one does not fit the framework at all. This table is the map for the pages that follow:

| Area                | Works with Deserve | Notes                                                              |
| ------------------- | ------------------ | ----------------------------------------------------------------- |
| HTTP serving        | Yes                | `router.serve()` binds the desktop port on its own                |
| View rendering      | Yes                | `ctx.render()` returns the page like any route                    |
| Windows             | Yes                | `BrowserWindow` controls the native window                        |
| Menus, tray, dock   | Yes                | Native menus and tray sit beside the server                       |
| Dialogs             | Yes                | `alert`, `confirm`, `prompt` resolve natively                     |
| Notifications       | Conditional        | Needs a signed bundle, a stable identifier, and a Finder launch   |
| Auto-update         | Yes                | `Deno.autoUpdate()` polls the release server from the Deno side   |
| Error reporting     | Yes                | Catches uncaught errors and posts a JSON report                   |
| Bindings            | No                 | `win.bind()` does not survive the Deserve serve path              |
| DevTools            | Backend-bound      | Available on the CEF backend, not on the default webview          |

## Reading Order

The series moves from a first build to distribution, and each page links to the next:

- [Building the App](/recipes/desktop/getting-started) sets up the `deno.json` block, embeds the routes and views, and fixes the working-directory trap.
- [Serving the UI](/recipes/desktop/serving) covers how `router.serve()` finds the desktop port and renders the page.
- [Windows, Menus, Tray and Dialogs](/recipes/desktop/native-apis) wires the native shell around the server.
- [Bindings and the HTTP Bridge](/recipes/desktop/bindings) explains the one incompatibility and the pattern that replaces it.
- [Notifications, Auto-update and Error Reporting](/recipes/desktop/notifications-updates) covers the runtime services.
- [Backends and Distribution](/recipes/desktop/distribution) ends with backend choice, output formats, and cross-compilation.
