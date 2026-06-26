---
description: 'Fire native notifications through the Web Notifications API, poll a release server with Deno.autoUpdate, and catch uncaught errors with a native alert and a JSON report, all from the Deno side of a Deserve desktop app.'
---

# Notifications, Auto-update and Error Reporting

> **Reference**: [Deno Desktop Notifications](https://docs.deno.com/runtime/desktop/notifications/)

Three runtime services live on the Deno side of a desktop bundle and need no special wiring to work behind Deserve. A notification reaches the OS through the standard Web API, the updater polls a release server, and the error reporter catches anything that escapes a handler. Each one runs from a route or from the native setup, since both share the same Deno permissions.

## Notifications

A desktop bundle implements the [Web Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notification), so the same `Notification` constructor a browser uses shows a native OS notification. The constructor is defined only inside a bundle, undefined under plain `deno run`:

```typescript twoslash
// Show a native OS notification
const notification = new Notification('Build complete', {
  body: 'The bundle is ready.'
})
notification.onclick = () => console.log('clicked')
```

### Permission Flow

A notification is gated by an OS permission, the same as on the web. `Notification.permission` reads the cached state, and `requestPermission()` prompts the first time the user has not decided:

```typescript twoslash
// Request permission before notifying
let permission = Notification.permission
if (permission !== 'granted') {
  permission = await Notification.requestPermission()
}

if (permission === 'granted') {
  new Notification('All set', { body: 'Notifications are on.' })
}
```

### Conditions on macOS

macOS only grants notification permission to an app with a stable code identity. Three conditions have to line up:

- A code-signed bundle, which `deno desktop` provides through an [ad-hoc signature](/recipes/desktop/distribution#code-signing) by default.
- A stable `app.identifier`, the reverse-DNS string set in [Building the App](/recipes/desktop/getting-started#the-desktop-block).
- A launch from Finder, since running the inner binary directly does not register the app identity. Launch the bundle with `open` instead.

When those hold, the permission prompt appears and the notification shows. Run the same binary straight from a terminal and the request returns `denied`, which is a launch-context limit of the OS rather than a Deserve issue.

### Firing From a Route

A page triggers a notification by calling an API route, the same [HTTP bridge](/recipes/desktop/bindings#page-to-deno-over-http) used everywhere else. The route fires the notification on the Deno side and reports the outcome:

```typescript twoslash
import type { Context } from '@neabyte/deserve'

// routes/api/notify.ts
export async function GET(ctx: Context): Promise<Response> {
  if (typeof Notification === 'undefined') {
    // Not a desktop bundle
    return ctx.send.json({ ok: false, reason: 'not desktop' })
  }
  let permission = Notification.permission
  if (permission !== 'granted') {
    permission = await Notification.requestPermission()
  }
  if (permission !== 'granted') {
    return ctx.send.json({ ok: false, permission })
  }
  // Fire the native notification
  new Notification('Deserve Desktop', { body: 'Saved.' })
  return ctx.send.json({ ok: true })
}
```

### Icons

The spec types `icon` as a URL string, and the runtime resolves only `data:` URLs synchronously. An `https:` or `file:` icon round-trips through the property but shows no image. A file on disk has to be read and encoded into a `data:` URL first:

```typescript twoslash
// Read the icon file as raw bytes
const iconBytes = await Deno.readFile('./icon.png')
// Encode the bytes to a base64 string
const base64 = btoa(String.fromCharCode(...iconBytes))
const iconDataUrl = `data:image/png;base64,${base64}`
new Notification('Heads up', { icon: iconDataUrl })
```

For a larger icon the spread call hits an argument limit, so a chunked loop over `iconBytes` building the binary string is the safe form. The [encodeBase64](https://jsr.io/@std/encoding/doc/base64) helper from the standard library handles that detail in one call.

## Auto-update

[`Deno.autoUpdate()`](https://docs.deno.com/api/deno/~/Deno.autoUpdate) ships updates after release without an app store. It runs on the Deno side and is independent of the serve path, so it works behind Deserve without conditions.

### Pointing at a Release Server

The updater needs a release base URL in the `desktop` block. The runtime fetches `<baseUrl>/latest.json` and pulls patch files relative to it:

```json
{
  "desktop": {
    "release": {
      "baseUrl": "https://releases.example.com/deserve-desktop"
    }
  }
}
```

This URL is the only server the runtime polls on its own. The manifest format and the patch flow are in the [auto-update reference](https://docs.deno.com/runtime/desktop/auto_update/).

### Checking for an Update

A call with no argument defaults to the configured base URL. The call resolves whether or not an update exists, so wrapping it in a try keeps a server outage from surfacing as an uncaught error. The centralized path is described in [error handling](/error-handling/object-details):

```typescript twoslash
import type { Context } from '@neabyte/deserve'

// deno-lint-ignore no-explicit-any
const D = Deno as any

// routes/api/update.ts
export async function GET(ctx: Context): Promise<Response> {
  try {
    // Poll the configured release server
    await D.autoUpdate()
    return ctx.send.json({ ok: true })
  } catch (error) {
    // Caught here, stays out of alerts
    return await ctx.handleError(500, error as Error)
  }
}
```

Applying a downloaded update is supported on macOS and Linux. The version it compares against comes from the root `version` field that [Building the App](/recipes/desktop/getting-started#the-desktop-block) sets.

## Error Reporting

A desktop bundle catches uncaught exceptions, unhandled rejections, and runtime panics on its own. It shows a native alert with the message and, when a reporting URL is set, posts a JSON report. The reporter registers before user code runs, so it covers faults across the Deno side and the page side.

### Configuring the Endpoint

The reporting URL goes in the `desktop` block and must use `https://` or `file://`. Plain `http://` is rejected, since a report carries stack traces. A `file://` URL appends the report to a local path, which suits a test run:

```json
{
  "desktop": {
    "errorReporting": {
      "url": "https://errors.example.com/report"
    }
  }
}
```

With no URL set, the alert still appears but no report is sent. The report schema and field list are in the [error reporting reference](https://docs.deno.com/runtime/desktop/error_reporting/).

### What Gets Caught

The reporter sees faults that escape a handler, not the ones already caught. An error inside a route's own try, like the [auto-update](#checking-for-an-update) example above, never reaches it. This pairs with Deserve's [centralized error handler](/error-handling/object-details), which shapes the HTTP responses, while the desktop reporter covers anything that escapes the request path entirely:

| Source                              | Caught by the reporter |
| ----------------------------------- | ---------------------- |
| Uncaught exception on the Deno side | Yes                    |
| Unhandled promise rejection         | Yes                    |
| Uncaught error in the page          | Yes                    |
| Runtime panic                       | Yes                    |
| An error inside a route try         | No                     |

A route that catches its faults and forwards them to `ctx.handleError()` keeps the response shaping in one place and keeps the native alert reserved for the truly unexpected.

The last page covers how the bundle is built and shipped, including the backend choice that decides DevTools availability: [Backends and Distribution](/recipes/desktop/distribution).
