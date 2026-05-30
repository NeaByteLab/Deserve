# Changelog

All notable changes to Deserve. Full commit history in chronological order.

Format inspired by [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Added

- `maxIterations` option on `EngineOptions` and `HandlerOptions` - limits `#each` loop iterations to prevent event loop starvation from unbounded template rendering (default 100,000). Exceeding the limit throws `Deno.errors.InvalidData` with a 500 response
- Hot reload for routes and templates via file system watchers (`Routing.Watcher`, `Rendering.Watcher`)
- `Helper` utility class consolidating `headersToRecord` from `Redirect` and `Response` into a shared `Helper.toRecord` method
- `Engine.viewsDir` getter, `Engine.invalidateFile()` and `Engine.refreshPaths()` for cache invalidation during hot reload
- `Handler.reloadRoute()` and `Handler.removeRoute()` for runtime route replacement
- `Handler.getViewEngine()` accessor
- `Scanner.registerHandlers()` static method extracted from inline scanning logic
- `WatchableEngine` interface for template cache invalidation
- Method overload signatures for `Context.cookie()`, `Context.header()`, `Context.query()`
- Documentation pages for hot reload feature (EN and ID)
- Indonesian landing page feature cards for middleware, template engine, and hot reload
- VitePress custom theme directory (`docs/.vitepress/theme/`) and `docs/en/index.md` standalone English landing page
- Test coverage for `Engine`, `Handler`, `Router`, `Scanner`, `Error`, `Redirect`, `Response`

#### Dependencies

- `@neabyte/stackz@^0.1.0` for formatted stack traces in route reload and scan error logging
- `@neabyte/superwatcher@^0.1.1` for file watching with debounce, event dedup, and atomic write detection
- `@neabyte/utils-core@^0.2.0` for `Async` debounce and `createSequential` utilities

#### Types

- `MaybeAsync<T>`, `DataRecord` type aliases in shared `Utility.ts` module
- `HttpMethod` literal union, `RouteFileExtension` literal union
- `RouteChangeEntry` interface for hot-reload pending route changes
- `RedirectStatus`, `RedirectBuilder`, `RedirectInit` types for redirect response typing
- `BodyParsedFormat`, `NextFn`, `MiddlewareResult`, `AsyncMiddlewareResult` exported type aliases
- `AstBlockNode`, `AstNodeType`, `ExprNodeType`, `ExprTokenKind` discriminant type aliases
- `AstBlockKind`, `UnaryOp`, `ArithmeticSign`, `BinaryOp`, `StructuralOp`, `TokenOp` operator literal types
- `SecurityHeaderKey`, `SecurityHeaderValue` type aliases
- `SocketCallback`, `SocketEventCallback<E>` type aliases in WebSocket interface
- `ErrorInfo` named interface replacing inline error object in `ErrorMiddleware`

### Changed

#### Error Handling

- Error types upgraded to `Deno.errors` for semantic error handling across `Context`, `Engine`, `Scanner`, `BasicAuth`, `Session`, `Worker`, `Response`, `Handler`, `Static`, `Tokenizer`
- `Error.buildResponse()` now sanitizes 5xx error messages using a static `serverErrorMessages` map instead of exposing raw internal error details
- `Handler.reloadRoute()` and `Scanner.discoverRoutes()` error logging now uses `Stackz.format()` for detailed formatted stack traces

#### Template Engine

- `Utils.lookup()` blocks prototype chain access via `Object.hasOwn` check - only own properties are accessible in templates
- `Engine.render()` and `Engine.streamRender()` refactored to share `resolveTemplate()` private method
- `Engine.renderNodes()` now delegates to `renderNodeToChunk()` instead of duplicating node type handling
- `Error.escapeHtml()` now escapes `"` and `'` in addition to `&`, `<`, `>`
- `Utils.escape()` in rendering engine now delegates to `Core.Error.escapeHtml()` instead of duplicating logic

#### Routing and Middleware

- `Handler.createHandler()` now strips response body for HEAD requests and falls back to GET handler when no HEAD route is registered
- CORS middleware returns `ctx.send.custom(null, ...)` for preflight (204) and forbidden origin (403) instead of `ctx.handleError()`
- `Context.parseCookies()` uses `for...of` and keeps only the first occurrence per RFC 6265
- `Context.parseHeaders()` simplified to `Object.fromEntries(this.req.headers)`
- `Router` constructor simplified - passes options directly to `Handler` instead of destructuring
- `Scanner.discoverRoutes()` uses extracted `registerHandlers()` instead of inline registration
- `Router.serve()` starts route and template watchers automatically after scanning
- File watchers migrated from internal `WatchFs` to `@neabyte/superwatcher`

#### Interface and Type Refinements

- `TemplateData` renamed to `DataRecord` and moved to shared `Utility.ts` module
- `MaybeAsync<T>` moved from file-local types to shared `Utility.ts`
- All interface properties made `readonly`
- `RouterOptions` now extends `HandlerOptions` instead of duplicating fields
- `StatusError` changed from `type` to `interface extends Error`
- `SendHelpers` and `StaticFileHandler` changed from `type` to `interface`
- `WebSocket.onDisconnect` type changed to `SocketEventCallback<CloseEvent>`, now receives `CloseEvent` as second argument
- `SecurityHeadersOptions` refactored to `Partial<Record<SecurityHeaderKey, SecurityHeaderValue>>`

#### Code Style

- JSDoc briefs and descriptions standardized to 6/9 word rule with periods
- Alphabetical sort order applied to all module-level declarations and class members
- `Handler.ts`, `Middleware.ts`, `Static.ts` interfaces refactored from barrel imports to direct named imports
- `Static.serve()` ETag hash generation simplified to a single `Array.from` with map callback
- `Watcher` uses `pendingChanges.values()` instead of destructured iteration
- VitePress config cleanup and documentation code blocks changed from ` ```dve ` to ` ```html `
- Indonesian landing page tagline updated

### Removed

- `WatchFs` class from `src/core/WatchFs.ts` - replaced by `@neabyte/superwatcher`
- `WatchedEvent` and `WatchFsOptions` types from `src/interfaces/Watcher.ts`
- `TemplateData` type alias - replaced by `DataRecord` in `Utility.ts`

### Fixed

- **Security**: Recursive `{{> include}}` crashes server process - self-referencing templates or circular include chains (A→B→A) caused infinite recursion, exhausting V8 heap memory (~4GB) and killing the Deno process. `Engine.render()` now tracks include depth and throws `Deno.errors.InvalidData` when exceeding 64 levels
- **Security**: Prototype chain leakage in DVE template `Utils.lookup()` - accessing `{{constructor}}`, `{{__proto__}}`, or `{{toString}}` in templates leaked native function references from the JavaScript prototype chain. Now blocked by `Object.hasOwn` check that only allows own properties, naturally preventing prototype chain traversal
- **Security**: Cookie last-write-wins allowed session fixation - duplicate cookie names (e.g. injected via subdomain or XSS) would overwrite the legitimate value. `parseCookies()` now keeps only the first occurrence per RFC 6265
- **Security**: Internal error details leaked to clients on 5xx responses - raw parser messages, template engine errors, and file system paths were exposed in JSON and HTML error responses. Server errors now return generic status text from a static lookup map
- DVE template `Utils.lookup()` no longer blocks own properties named `constructor`, `toString`, etc. - the previous `unsafeProperties` blocklist prevented rendering user data with these key names even when explicitly set. Replaced with `Object.hasOwn` which allows own properties while still blocking prototype-inherited ones
- DVE expression tokenizer now supports scientific notation (`1e2`, `2.5e3`, `1e-3`, `5E2`) - previously `{{1e308 + 1e308}}` crashed with 500 because the tokenizer parsed `1` as number and `e308` as identifier
- `Redirect` and `Response` no longer carry duplicate `headersToRecord` implementations
- HEAD requests no longer hang - response body is stripped and Content-Length omitted so clients don't wait for bytes that never arrive
- HEAD requests now fall back to GET handler when no HEAD route is registered, matching standard HTTP semantics
- CORS preflight no longer returns 500 - `ctx.handleError(204, ...)` created a JSON body on null-body status 204, causing Deno to throw. Now uses `ctx.send.custom(null, { status: 204 })` directly

---

## [0.10.0] - 2026-05-23

### Added

- DVE template test fixtures for `nested-if`, `each-nonarray`, `attack-else-without-if`, and `attack-unclosed-block`
- Streaming template rendering via `ViewEngine.streamRender()` and `Context.streamRender()` methods for progressive HTML output using `TransformStream`
- Documentation guides for DVE template syntax and streaming rendering
- Cross-platform CI build matrix (Ubuntu, macOS, Windows) in GitHub Actions workflow
- `.gitattributes` to enforce LF line endings across all platforms
- `@std/assert` import map alias for standardized test assertions
- Packaged DVE language extension (`.vsix`) with improved HTML syntax embedding
- Test suites for rendering engine sub-modules (Eval, Expression, Parser, Tokenizer, Utils)
- Edge case test coverage for Context body parsing, Response factory methods, BasicAuth credentials, CORS options, BodyLimit boundaries, SecHeaders combinations, wrapMiddleware error handling, Scanner validation, and Handler content negotiation

### Changed

- DVE template parsing is now strict: unmatched `{{else}}`, `{{/if}}`, `{{/each}}` and unclosed `{{#if}}`/`{{#each}}` blocks throw errors instead of being silently ignored
- Remove `options` parameter from `ViewEngine.render()` - the engine always uses its configured `viewsDir`
- Remove `optional` flag from `ExprNode` member access (expression AST simplification)
- Simplify `Router` constructor using object destructuring instead of manual property copying
- Simplify `Worker.createPool` using `Array.from` instead of manual loop
- Simplify `headersToRecord` in `Context`, `Redirect`, and `Response` using `Object.fromEntries`
- Simplify `Context.parseHeaders` and `Context.parseQuery` using `Object.fromEntries`
- Reorganize method ordering in `Context`, `Engine`, and `Session` (getters first, public, private, A-Z sorted)
- Sort interface and type exports alphabetically in `Error`, `Middleware`, `Render`, `Static`, `Worker`
- Standardize all error messages across `src/` to use consistent wording (no trailing periods, no colons before details)
- Apply JSDoc with `@description`, `@param`, `@returns`, and `@throws` across all interfaces
- Update documentation examples and guides to match new error message wording

### Fixed

- Windows path handling in static file serving - backslash separators are now normalized correctly
- Filename extraction in `Response.file()` now splits on both `/` and `\` for cross-platform compatibility
- Cross-platform test path resolution using `fileURLToPath` instead of raw URL strings
- TypeScript parameter compatibility in `streamRender()` method

### 2026-05-23

- `b65c622` fix(static): handle Windows backslash paths in file serving
- `366c920` fix(response): split filename on both / and \ separators
- `d61aaf3` style(tests): use import map alias for @std/assert
- `16a015b` chore(config): add @std/assert import map alias
- `2a34f8d` fix(tests): use fileURLToPath for cross-platform path resolution
- `80ac484` ci(git): enforce LF line endings across all platforms
- `9dd2934` ci(workflow): add cross-platform build matrix
- `bf7612e` docs(changelog): add entries for refactoring and standardization pass
- `b66ed14` docs(guides): update error messages in examples and descriptions
- `ecd6ebe` test(assertions): update expected error messages to match new wording
- `9ca9dbe` refactor(middleware): standardize errors and reorder Session methods
- `516c772` refactor(scanner): standardize route validation error messages
- `2ac12f7` refactor(router): simplify constructor with object destructuring
- `04e048b` refactor(rendering): standardize error messages and reorder methods
- `39100ef` refactor(worker): simplify pool creation and standardize errors
- `ed08584` refactor(core): simplify headersToRecord with Object.fromEntries
- `00e407b` refactor(context): reorder getters and simplify parsing
- `fbbba86` style(interfaces): apply JSDoc standards and sort exports A-Z

### 2026-05-18

- `2254a5f` test(rendering): add engine sub-module unit test suite
- `9f53fdb` test(fixtures): add DVE templates for edge case coverage
- `8893340` test(rendering): add Engine caching, edge case, and streaming coverage
- `22b0e5e` test(rendering): add Discover views directory coverage
- `9551bb5` test(router): add Scanner pattern and validation coverage
- `f4944cd` test(router): add Handler content negotiation and middleware coverage
- `ede1a6a` test(middleware): add wrapMiddleware error handling coverage
- `0d0dcbc` test(security): add SecHeaders individual and combined coverage
- `8c787a2` test(cors): add CORS credential and default option coverage
- `6961b22` test(body): add BodyLimit boundary and method coverage
- `e69bde9` test(auth): add BasicAuth credential and scheme edge cases
- `4fc7d3a` test(core): add Response factory method edge case coverage
- `6d0fcd5` test(core): add Context body parsing and accessor coverage
- `712cc38` style(test): sort test cases alphabetically

### 2026-05-10

- `20dd6e6` build(editor): add packaged DVE language extension
- `982ac92` feat(editor): improve DVE HTML syntax embedding
- `c10080b` docs(editor): document DVE VSIX installation
- `48f8123` style(config): remove extra blank line

### 2026-03-28

- `9e53364` feat(rendering): add streaming template rendering
- `7356485` docs(rendering): add DVE template and streaming guides
- `63d0455` docs(config): update VitePress nav and changelog for streaming

### 2026-03-19

- `bc62ff3` docs(example): update showcase and project root link
- `62e59a4` refactor(rendering): engine JSDoc, naming, spacing
- `a0b0c60` style(rendering): apply deno fmt to engine
- `d6e24f2` refactor(rendering): drop render options parameter
- `0a37f9a` docs(changelog): add Unreleased rendering entry
- `7d3d0f7` test(rendering): add invalid template coverage
- `8d25b5e` refactor(rendering): make DVE parsing strict
- `83610cb` docs(changelog): document strict DVE parsing
- `e835fb4` docs(editor): clarify DVE safe member access

## [0.9.0] - 2026-03-19

### 2026-03-19

- `0beedd8` style(routing): format Handler implementation
- `608cb3f` feat(security): enforce URL and route param limits with 414
- `73f2842` docs(changelog): update security and test entries
- `0ad46dd` test(security): add 414 length-limit assertions
- `b9823bd` docs(changelog): update Unreleased entries
- `8f261f6` chore(publish): use explicit publish include list
- `ca229da` test(rendering): align DVE test fixtures naming
- `afeb7e0` docs(editor): add DVE syntax highlighting docs
- `07f299e` feat(benchmark): add DVE view rendering benchmarks
- `2b6bd44` docs(readme): tighten copy and remove doc outline
- `6cc83c2` docs(changelog): update Unreleased section
- `73d8c89` test(tests): restructure test folders
- `1d8bdf6` test(config): add human error coverage
- `cb58c42` refactor(rendering): add DVE view engine and shorten API names
- `817be4a` refactor(middleware): align middleware modules
- `e6797a8` refactor(src): split modules into domains
- `6114c4c` chore(deno): add src path aliases

### 2026-03-10

- `32b01db` feat(worker): add optional worker pool for CPU-bound work

### 2026-03-07

- `a9db24b` docs(example): add Deserve-React to showcase

---

## [0.8.0] - 2026-03-07

### 2026-03-07

- `a3c8317` feat(deserve): request timeout, session HMAC signing, and docs alignment
- `f492ef5` docs(docs): update VitePress config and en/id content
- `8e0f338` fix(handler): extend middleware to nested paths and tidy formatting
- `ce1c8c0` docs(core): add JSDoc for private members and tidy formatting
- `2e198e5` style(src): apply Deno format to Context and middleware index
- `2e15097` refactor(deserve): extract response/static/error, pluggable handler, middleware classes

### 2025-12-31

- `4d4dcdb` style(handler): enforce braces for control statements
- `1c80c4e` feat(deserve): optimize framework for streaming and error handling

---

## [0.7.0] - 2025-10-30

### 2025-10-30

- `0ff9118` release(docs): mark features as released and update version to 0.7.0
- `583106f` docs(static-file): clarify path extraction and wildcard pattern behavior
- `3675be0` fix(handler): fix route scanning and static file path resolution
- `010597f` fix(docs): configure search at root level
- `36f8336` feat(middleware): add security headers middleware

### 2025-10-29

- `a4c8db8` feat(middleware): add body limit middleware
- `acb560d` feat(middleware): add basic auth and improve error handling
- `ef190fa` feat(docs): restructure documentation with i18n support
- `2812d25` feat(router): simplify constructor and add middleware support
- `5569c43` feat(static): add custom static file serving

### 2025-10-28

- `6fb36b7` refactor(core): migrate to Context-based architecture

### 2025-10-27

- `8a99a21` fix(core): migrate to external router and fix replacement bugs

### 2025-10-26

- `dfd1b35` feat(routing): add case-sensitive routing and filename characters
- `f4416c3` feat(core): add middleware support for DeserveRequest objects

### 2025-10-25

- `81d5822` feat(middleware): add websocket middleware support
- `31f35d7` feat(benchmark): add performance benchmarks documentation
- `984ebad` refactor(router): migrate to FastRouter with radix tree structure
- `cfa06cd` feat(docs): add request body parsing methods and bump version
- `3fdacd9` feat(request): add enhanced request handling with automatic parsing
- `50192b7` refactor(constants): centralize HTTP methods and improve validation
- `8866020` docs(installation): update deno install link
- `18db701` ci(deploy): add nojekyll file creation to vitepress build
- `8e548b3` docs(readme): add installation section
- `1c0cecb` docs(readme): add server configuration link
- `2c43a20` feat(router): enhance serve method with hostname and graceful shutdown

### 2025-10-24

- `d00d938` feat(send): add download response methods
- `5d2821f` docs(rebuild): trigger rebuild for sidebar fix
- `23e8677` docs(config): update documentation and version
- `be7fa66` refactor(docs): move CNAME file location
- `e2f931a` docs(deploy): update build configuration and domain setup
- `9df2495` docs(project): restructure documentation and simplify README
- `8e63612` feat(router): add route module validation
- `aa205ca` feat(utils): add Send utility class for HTTP responses
- `60e6a8d` feat(router): add route-specific middleware and improve documentation
- `de1937b` chore(config): bump version to 0.1.5
- `783b6ba` refactor(router): improve route parsing and scanning logic
- `ba1c5df` feat(router): add HTTPS URL parsing and update version
- `25955bf` fix(router): resolve JSR import path issues and improve route handling
- `99e8696` feat(router): fix module import path resolution
- `6448d7e` feat(static): improve static file serving and documentation
- `e4f471c` fix(router): remove hardcoded path prefix from routes directory
- `c210179` feat(ci): add GitHub Actions workflow and improve router configuration
- `66895d7` feat(router): add static file serving capability
- `09b1e4a` feat(middleware): add built-in CORS middleware and enhanced middleware processing
- `38eaace` feat(error): add error handling middleware
- `aaa14d2` feat(router): initial implementation of file-based routing library

---

[Unreleased]: https://github.com/NeaByteLab/Deserve/compare/v0.10.0...HEAD
[0.10.0]: https://github.com/NeaByteLab/Deserve/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/NeaByteLab/Deserve/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/NeaByteLab/Deserve/compare/v0.7.0...v0.8.0
