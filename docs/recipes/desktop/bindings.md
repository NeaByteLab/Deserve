---
description: 'Why win.bind and the bindings proxy do not survive the Deserve serve path, and the HTTP API plus executeJs pattern that carries data between the page and the Deno side in both directions.'
---

# Bindings and the HTTP Bridge

> **Reference**: [Deno Desktop Bindings](https://docs.deno.com/runtime/desktop/bindings/)

The `deno desktop` runtime ships a binding channel. [`win.bind()`](https://docs.deno.com/api/deno/~/Deno.BrowserWindow.bind) registers a Deno function, and the page calls it through a `bindings.<name>()` proxy as if the function were local, with no HTTP hop. It is the one part of the desktop surface that does not work behind a Deserve server, so this page explains the behaviour and the pattern that replaces it.

## What the Channel Promises

Outside Deserve, a binding looks clean. The Deno side registers a handler, the page calls it, and the call resolves across the boundary:

```typescript twoslash
// deno-lint-ignore no-explicit-any
const win = {} as any
// ---cut---
// Deno side, registers a handler
win.bind('saveNote', async (text: string) => {
  await Deno.writeTextFile('./note.txt', text)
  return { ok: true }
})
```

```typescript twoslash
// Page side, calls it like a local function
// deno-lint-ignore no-explicit-any
declare const bindings: any
// ---cut---
const result = await bindings.saveNote('hello')
```

## Why It Breaks Behind Deserve

The binding bridge attaches to the webview when the runtime stands up its own server. Deserve runs its serve path through an internal `Deno.serve` call wrapped in framework logic, and that wrapper detaches the bridge from the visible webview. The proxy still answers on the page, `typeof bindings.saveNote` reads `function`, because the proxy builds a function on access. The call itself then rejects:

```
Error: No callback bound for: saveNote
```

The failure does not depend on timing. Binding before serve, binding after the server starts, reloading the window, or constructing the window later all reject the same way. A raw `Deno.serve` plus `win.bind` works, and the same `win.bind` behind `router.serve()` does not, which places the cause on the serve path rather than the binding call.

The practical takeaway is short. Treat bindings as unavailable in a Deserve desktop app and carry data over HTTP instead.

## The Replacement: Two Directions

A desktop app needs traffic both ways, page to Deno and Deno to page. Two transports already cover both, and neither touches the binding channel.

### Page to Deno over HTTP

The page calls an API route, and the route runs with Deno's permissions. This is the same call shape from [Serving the UI](/recipes/desktop/serving#talking-back-to-the-server), now framed as the binding replacement:

```typescript twoslash
// Page side, replaces a bindings call
async function saveNote(text: string): Promise<{ path: string }> {
  // Post to a local API route instead
  const response = await fetch('/api/note', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text })
  })
  return await response.json()
}
```

```typescript twoslash
import type { Context } from '@neabyte/deserve'

// routes/api/note.ts
export async function POST(ctx: Context): Promise<Response> {
  // Read the typed JSON request body
  const requestBody = await ctx.get.body<{ text?: string }>()
  const homeDir = Deno.env.get('HOME') ?? '.'
  const path = `${homeDir}/.note.txt`
  // Write the note with Deno permissions
  await Deno.writeTextFile(path, requestBody?.text ?? '')
  return ctx.send.json({ path })
}
```

The route owns the disk access, so a single handler serves the page in a window and a browser on a host without a branch.

### Deno to Page with executeJs

The other direction runs a snippet inside the page from the Deno side with `executeJs()`, the same call the [menu handler](/recipes/desktop/native-apis#application-menu) uses. The page assigns the `saveNote` function from above onto `window`, and the native side calls it by name:

```typescript twoslash
// deno-lint-ignore no-explicit-any
async function saveNote(text: string): Promise<{ path: string }> {
  return { path: '' }
}
// ---cut---
// Read the textarea, then reuse saveNote
function saveNoteFromPage(): Promise<{ path: string }> {
  const field = document.querySelector('textarea')
  return saveNote(field?.value ?? '')
}
// Expose it for the native menu
// deno-lint-ignore no-explicit-any
;(window as any).saveNote = saveNoteFromPage
```

```typescript twoslash
// deno-lint-ignore no-explicit-any
const win = {} as any
// ---cut---
// Run the page handler if it exists
win.executeJs('if (window.saveNote) window.saveNote()')
```

A menu shortcut and an in-page button now share one save path. The menu calls `executeJs`, the button calls `saveNote` directly, and both land in the same API route. The guard matters because `executeJs` can run before the page finishes loading, when `window.saveNote` is still undefined.

## Reading the Result

A page that needs a value from Deno, such as the running state or system info, reads it from a JSON route rather than a binding return. The desktop check from [Serving the UI](/recipes/desktop/serving#detecting-desktop-mode) follows this exact shape, where `Deno.desktopVersion` travels over the API instead of through `bindings`.

## Cost and Payoff

The HTTP hop adds a loopback round trip that a binding would skip. On a local connection the cost is below human perception for the request rates a desktop UI produces, so the tradeoff favours the simpler model. The payoff is one server that behaves identically on a host and in a window, with no separate binding layer to register, debug, or keep in sync.

With data flowing both ways, the remaining pieces are the runtime services that sit on the Deno side: [Notifications, Auto-update and Error Reporting](/recipes/desktop/notifications-updates).
