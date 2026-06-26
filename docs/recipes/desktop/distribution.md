---
description: 'Pick a rendering backend for a Deserve desktop app, build platform bundles like app, dmg, msi, and AppImage, cross-compile to other targets from one host, and code-sign the macOS bundle.'
---

# Backends and Distribution

> **Reference**: [Deno Desktop Backends](https://docs.deno.com/runtime/desktop/backends/)

The final step turns the project into shippable bundles. A backend choice decides how the page renders and whether DevTools is available, the output extension decides the package format, and one host can cross-compile for every target. The Deserve server stays the same across all of it, since distribution is a packaging concern.

## Choosing a Backend

The `backend` field, or the `--backend` flag, selects the rendering engine baked into the bundle. Three options exist, and only two suit a Deserve app:

| Backend   | Rendering                          | Size            | DevTools | Fits Deserve |
| --------- | ---------------------------------- | --------------- | -------- | ------------ |
| `webview` | The OS webview, default            | Small           | No       | Yes          |
| `cef`     | Bundled Chromium                   | Large, ~150 MB  | Yes      | Yes          |
| `raw`     | No web engine                      | Smallest        | No       | No           |

The `webview` backend uses the OS engine, WKWebView on macOS, WebView2 on Windows, WebKitGTK on Linux. It keeps the bundle small and renders the Deserve page well, at the cost of per-platform rendering differences.

The `cef` backend bundles Chromium for identical rendering everywhere and full DevTools, in exchange for a much larger download. The framework binary downloads once and caches.

The `raw` backend has no webview at all, so a Deserve UI served over HTTP has nothing to render it. A build succeeds and the server still runs, but no page appears. Reserve `raw` for apps that draw their own surface, not for a web UI.

```json
{
  "desktop": {
    "backend": "webview"
  }
}
```

The `--backend` flag overrides the field for one build and accepts only `cef` and `webview`. Selecting `raw` happens through the field. Switching between `cef` and `webview` needs no code change, since the same window, menu, and event APIs work on both.

## DevTools

DevTools attaches to the page for inspecting elements, the console, and the network panel. It is available on the `cef` backend only. The default `webview` backend speaks a different inspector protocol that the unified DevTools does not target yet, so [`win.openDevtools()`](https://docs.deno.com/api/deno/~/Deno.BrowserWindow.openDevtools) is a no-op there.

A build that needs DevTools switches to `cef` for development, then ships on whichever backend suits the release:

```bash
# Run with Chromium for DevTools
deno desktop --backend cef --include routes --include views main.ts
```

The Deno side runs an inspector under `--inspect` regardless of backend, so server-side debugging stays available even on `webview`. The full inspector flow is in the [DevTools reference](https://docs.deno.com/runtime/desktop/devtools/).

## Output Formats

The output extension decides the package the build produces. The `output` block sets a path per platform, and the [`--output`](https://docs.deno.com/runtime/desktop/distribution/) flag overrides it for one build:

```json
{
  "desktop": {
    "output": {
      "macos": "./dist/DeserveDesktop.app",
      "windows": "./dist/DeserveDesktop",
      "linux": "./dist/deserve-desktop"
    }
  }
}
```

Each platform accepts several extensions:

| Platform | Extension     | Produces                       |
| -------- | ------------- | ------------------------------ |
| macOS    | `.app`        | Application bundle, the default |
| macOS    | `.dmg`        | Drag-to-Applications disk image |
| Windows  | directory     | App folder with a launcher      |
| Windows  | `.msi`        | Windows Installer package       |
| Linux    | directory     | App folder with a launcher      |
| Linux    | `.AppImage`   | Single-file portable bundle     |
| Linux    | `.deb`        | Debian or Ubuntu package        |
| Linux    | `.rpm`        | Fedora or RHEL package          |

A `.dmg` shells out to `hdiutil`, so it has to build on a macOS host. The rest assemble in pure Rust and build from any host:

```bash
# Build a drag-to-Applications disk image
deno desktop --include routes --include views --output ./dist/DeserveDesktop.dmg main.ts
```

## Cross-Compilation

One host builds for every supported target. `--target` names a single triple, and `--all-targets` covers them all. The CLI downloads the matching runtime and backend archive for the target, with no platform toolchain on the host:

```bash
# Build for macOS Intel from any host
deno desktop --target x86_64-apple-darwin --include routes --include views main.ts
```

The supported triples are `aarch64-apple-darwin`, `x86_64-apple-darwin`, `x86_64-pc-windows-msvc`, `aarch64-unknown-linux-gnu`, and `x86_64-unknown-linux-gnu`. The lone exception to host-free cross-building is the macOS `.dmg`, which needs `hdiutil` and therefore a macOS host. The full matrix and a CI example are in the [distribution reference](https://docs.deno.com/runtime/desktop/distribution/).

## Compressing the Bundle

`--compress` ships a self-extracting bundle. The heavy runtime payload is compressed in the distributed app and unpacked to a per-user folder on first launch, which shrinks the download in exchange for a one-time decompression:

```bash
# Smaller download, unpacks on first launch
deno desktop --compress --include routes --include views main.ts
```

The codec defaults to a smaller-artifact setting and can be chosen with `--compress=xz` or `--compress=zstd`, where `zstd` trades some size for a faster first launch.

## Code Signing

On macOS, `deno desktop` signs the bundle on its own. The default is an ad-hoc signature, written as `-`, which gives the app a stable code identity, enough for the OS to grant [notification permission](/recipes/desktop/notifications-updates#conditions-on-macos), but not enough to distribute without Gatekeeper warnings:

```json
{
  "desktop": {
    "macos": {
      "codesignIdentity": "-"
    }
  }
}
```

A real Developer ID identity replaces the `-` and produces a notarizable bundle signed with Hardened Runtime. Notarization stays a separate step run with `xcrun notarytool`. Signing runs on a macOS host, since it shells out to `codesign`. The signing and notarization detail is in the [distribution reference](https://docs.deno.com/runtime/desktop/distribution/#code-signing).

## Back to the Map

That closes the loop from a first build to a shipped bundle. The [overview](/recipes/desktop/overview#feature-compatibility) holds the compatibility map for the whole surface, and a production Deserve server outside the desktop context is covered in [Production Deploy](/recipes/production-deploy).
