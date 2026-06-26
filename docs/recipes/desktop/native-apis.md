---
description: 'Wrap the Deserve server in a native shell with a BrowserWindow, application and context menus, a tray icon, dock behaviour, and native dialogs, all guarded so the same entry runs under deno run.'
---

# Windows, Menus, Tray and Dialogs

> **Reference**: [Deno Desktop Windows](https://docs.deno.com/runtime/desktop/windows/)

The native shell sits beside the Deserve server rather than inside it. The server keeps serving the page, and a separate block of setup code creates the window, hangs menus off it, drops an icon in the tray, and answers native dialogs. All of it runs from the same entry file, so one `main.ts` covers both the web side and the native side.

## Staying Dual-Mode

The native classes live under `Deno` only inside a `deno desktop` bundle. On a host with `deno run`, `Deno.BrowserWindow` is undefined. A guard checks for it once and skips the entire native setup when it is missing, which keeps browser-based development working off the same file:

```typescript twoslash
// deno-lint-ignore no-explicit-any
const D = Deno as any

function isDesktop(): boolean {
  // Native classes exist only in a bundle
  return typeof D.BrowserWindow === 'function'
}

export function setupDesktop(): void {
  if (!isDesktop()) {
    // Skip native wiring on a host
    return
  }
  // ... create the window and menus
}
```

Calling `setupDesktop()` from `main.ts` before `router.serve()` wires the shell on a desktop build and stays out of the way everywhere else.

## Creating the Window

A bundle opens with one implicit startup window. Constructing the first [`BrowserWindow`](https://docs.deno.com/api/deno/~/Deno.BrowserWindow) adopts that window instead of opening a second one, so the title and size apply to the window already on screen:

```typescript twoslash
// deno-lint-ignore no-explicit-any
const D = Deno as any
// ---cut---
// Adopt the implicit startup window
const win = new D.BrowserWindow({
  title: 'Deserve Desktop',
  width: 980,
  height: 680
})
```

The window object drives the visible window from the Deno side. The common moves are `show()`, `hide()`, `focus()`, and `reload()`, and `executeJs()` runs a snippet of JavaScript inside the page, which is how the Deno side reaches back into the webview.

## Application Menu

[`setApplicationMenu()`](https://docs.deno.com/api/deno/~/Deno.BrowserWindow.setApplicationMenu) builds the menu bar from an array of submenus. Each entry is either a custom `item` with an id and an optional accelerator, or a `role` that maps to a built-in action like quit or copy:

```typescript twoslash
// deno-lint-ignore no-explicit-any
const win = {} as any
// ---cut---
win.setApplicationMenu([
  {
    submenu: {
      label: 'File',
      items: [
        // Custom item with a keyboard shortcut
        { item: { label: 'Save', id: 'save', accelerator: 'CmdOrCtrl+S', enabled: true } },
        // Built-in role handles itself
        { role: { role: 'quit' } }
      ]
    }
  }
])
```

A click on a custom item fires a `menuclick` event carrying the id, so one listener routes every menu choice. The handler reaches into the page with `executeJs()` when the action belongs to the web side. The page exposes a `saveNote` function on `window`, and the snippet calls it after a guard, since the function only exists once the page has loaded:

```typescript twoslash
// deno-lint-ignore no-explicit-any
const win = {} as any
// ---cut---
// deno-lint-ignore no-explicit-any
win.addEventListener('menuclick', (event: any) => {
  switch (event.detail.id) {
    case 'save':
      // Run the page save handler if present
      win.executeJs('if (window.saveNote) window.saveNote()')
      break
  }
})
```

The page assigns `window.saveNote` so the menu shortcut and an in-page button trigger one save path. This Deno-to-page direction through `executeJs()` pairs with the page-to-Deno HTTP calls from [Serving the UI](/recipes/desktop/serving#talking-back-to-the-server), and together they replace the native binding channel explained in [Bindings and the HTTP Bridge](/recipes/desktop/bindings).

## Context Menu

A right click opens a context menu through [`showContextMenu()`](https://docs.deno.com/api/deno/~/Deno.BrowserWindow.showContextMenu), positioned at the cursor. The menu array uses the same item shape as the application menu, and a `contextmenuclick` event carries the chosen id:

```typescript twoslash
// deno-lint-ignore no-explicit-any
const win = {} as any
// ---cut---
const menu = [
  { item: { label: 'Reload', id: 'ctx-reload', enabled: true } },
  { item: { label: 'Quit', id: 'ctx-quit', enabled: true } }
]

// deno-lint-ignore no-explicit-any
win.addEventListener('mousedown', (event: any) => {
  // Secondary button opens the menu
  if (event.button === 2) {
    win.showContextMenu(event.clientX, event.clientY, menu)
  }
})
```

## Window Events

The window emits lifecycle events. A `close` listener that calls `preventDefault()` keeps the app alive when the window is closed, which suits an app that hides to the tray instead of quitting:

```typescript twoslash
// deno-lint-ignore no-explicit-any
const win = {} as any
// ---cut---
// deno-lint-ignore no-explicit-any
win.addEventListener('close', (event: any) => {
  // Hide to tray instead of quitting
  event.preventDefault()
  win.hide()
})
```

The tray menu then carries the explicit quit, so the user always has a way out.

## Tray Icon

A [`Tray`](https://docs.deno.com/api/deno/~/Deno.Tray) places an icon in the system tray with a tooltip and a menu. The icon takes raw PNG bytes, and the menu uses the same item shape seen above:

```typescript twoslash
// deno-lint-ignore no-explicit-any
const D = Deno as any
// deno-lint-ignore no-explicit-any
const win = {} as any
const iconBytes = new Uint8Array()
// ---cut---
const tray = new D.Tray()
// Set the tray icon from PNG bytes
tray.setIcon(iconBytes)
tray.setTooltip('Deserve Desktop')
tray.setMenu([
  { item: { label: 'Show Window', id: 'show', enabled: true } },
  { item: { label: 'Quit', id: 'quit', enabled: true } }
])

tray.addEventListener('click', () => {
  // A tray click restores the window
  win.show()
  win.focus()
})
```

## Dock Behaviour

On macOS the [`dock`](https://docs.deno.com/api/deno/~/Deno.dock) object handles dock interactions. A `reopen` event fires when the dock icon is clicked with no visible window, which is the moment to bring the UI back:

```typescript twoslash
// deno-lint-ignore no-explicit-any
const D = Deno as any
// deno-lint-ignore no-explicit-any
const win = {} as any
// ---cut---
// deno-lint-ignore no-explicit-any
D.dock?.addEventListener('reopen', (event: any) => {
  // Reopen when no window is visible
  if (!event.detail?.hasVisibleWindows) {
    win.show()
    win.focus()
  }
})
```

The dock object is macOS only, so the optional chaining lets the same code run untouched on Windows and Linux.

## Native Dialogs

The web dialog functions resolve as native OS dialogs inside a bundle. `alert()` shows a message, `confirm()` returns a boolean, and `prompt()` returns the typed string or null. They work from both the Deno side and the page side:

```typescript twoslash
// deno-lint-ignore no-explicit-any
const win = {} as any
// ---cut---
// Block until the user answers
if (confirm('Quit Deserve Desktop?')) {
  Deno.exit(0)
}

// Read a value back from the user
const name = prompt('Enter your name:', 'Deno')
win.executeJs(`document.title = ${JSON.stringify(String(name))}`)
```

With the shell in place, the next page covers the one native feature that does not fit the Deserve serve path, and the HTTP pattern that stands in for it: [Bindings and the HTTP Bridge](/recipes/desktop/bindings).
