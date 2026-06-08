# Changelog

All notable changes to Deserve. Full commit history in chronological order.

Format inspired by [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Added

- Centralized observability event bus (`core/Observability.ts`) built on an error-isolated signal, exposing a single `router.on(listener)` tap that streams a discriminated `Event` union of thirteen lifecycle and error types, each carrying a `timestamp` and, where relevant, the raw `Error` for developer-owned logging and APM/OTEL pipelines
- Emit sites wired across the framework for route lifecycle (`route:loaded`, `route:skipped`, `route:reloaded`, `route:removed`, `route:error`, `reload:error`), view lifecycle (`view:compiled`, `view:rendered`, `view:refreshed`, `view:error`), `server:listening`, `request:error`, and `process:error`
- `core/Guard.ts` process-fault sentinel registered by `Router.serve()`, catching `unhandledrejection` and uncaught `error` events once across all routers and surfacing each as a `process:error` event instead of letting it terminate the process
- `core/Guard.ts` additionally interposes native termination APIs (`Deno.exit`, `Deno.kill`, and the node `process.exit`/`abort`/`reallyExit`/`kill` shims), blocking a self-kill or exit from application code and reporting it as a `process:error` while kills aimed at other PIDs still pass through
- `Context.send.file()` and `Context.send.data()` now emit an RFC 6266 / RFC 5987 compliant `Content-Disposition`, adding a `filename*=UTF-8''` parameter so Unicode download names round-trip alongside the ASCII fallback
- `Handler.extractError()` maps standard `Deno.errors.*` classes to semantically matching HTTP status codes (`NotFound`→404, `PermissionDenied`→403, `AlreadyExists`→409, `InvalidData`→400, `NotSupported`→501, `TimedOut`→504)
- Missing 405 Method Not Allowed: when a path exists under other HTTP methods, the framework returns 405 with an `Allow` header listing valid methods instead of 404
- `Handler.errorResponse()` safe fallback rebuilds responses from hardened defaults when accumulated headers are malformed, guaranteeing valid masked output even on developer header poisoning
- `Static.etagMatch()` implements RFC 9110 Section 13.1.2 weak comparison, supporting `W/` prefix stripping, comma-separated lists, and wildcard `*` for proper 304 handling
- `Context.assertValidHeader()` validates header names and values using the WHATWG `Headers` built-in before assignment
- `WrapMware` function (previously `Utils.wrapMiddleware`) inlined into `middleware/index.ts` as the public middleware wrapper export
- Worker pool gains a configurable per-task `taskTimeoutMs` (default 30 seconds), bounding how long a single dispatch may run before the slot is reclaimed and replaced
- `Context.param()` now percent-decodes route param values once, so `/users/john%20doe` yields `john doe`, matching the decoded contract `Context.query()` already provides
- `Context.finalizeRaw()` applies middleware-accumulated headers and `Set-Cookie` values to a native `Response` returned directly from a handler, so security headers, CORS, and session cookies survive the raw-return path
- DVE templates can now read own data properties of string values such as `{{ text.length }}` and character indices, while methods and the prototype chain stay unreachable

### Changed

#### Security Hardening

- All response construction paths now include baseline security headers, including 414 URI Too Long and 503 request timeout responses that previously produced bare responses
- `Redirect.resolveLocation()` resolves the target URL with the standard parser first, then enforces same-origin for relative-looking inputs and requires an http(s) scheme, closing protocol-relative and backslash-normalization bypasses
- WebSocket middleware validates the `Origin` header before upgrade, defaulting to same-origin enforcement with configurable allowlist or wildcard opt-out, preventing cross-site WebSocket hijacking
- `Worker.run()` serializes tasks per worker via a tail-promise chain, preventing concurrent response cross-talk when multiple requests land on the same worker
- Worker pool now contains uncaught worker errors instead of letting them terminate the host process, and self-heals by respawning a crashed worker at its slot so future dispatches never hang
- Worker pool now bounds every task with a per-task timeout, so a dispatch that never settles is reclaimed and its slot replaced rather than tying up worker capacity indefinitely
- `Handler.createHandler()` validates middleware and route handler return values with `instanceof Response`, routing non-Response returns through the full error pipeline instead of escaping to a bare 500
- `Handler.buildResponse()` now accepts a custom error handler result only when it is an actual `Response`, so any other return value falls through to the safe default error path with security headers, content negotiation, and message masking intact
- Middleware and static registration now fail fast at call time: `addMiddleware` rejects a non-function handler, `addStaticRoute` requires a non-empty string path, and `Router.use(path)` requires at least one handler, each throwing a descriptive `TypeError` instead of registering a broken entry that only fails on later requests
- Request timeout (503) responses now flow through the same observability reporter as every other error path, emitting a `request:error` event with status 503 so operators can alert and trace on timeouts
- `Eval.evalNode()` uses a fail-closed whitelist switch over known node types and operators, rejecting unknown constructs by default
- `Utils.lookup()` and `Eval` ident/member resolution read only own enumerable data properties via `Object.hasOwn`, excluding the prototype chain from template resolution
- `Engine` #each iteration scope built as flat own-property spread, preserving parent-scope visibility while keeping prototype chain clean
- Session `base64UrlEncode` and `base64UrlDecode` use zero-allocation loops with single-pass regex instead of intermediate arrays and chained replacements
- BasicAuth no longer leaks the `WWW-Authenticate` challenge header on successful requests
- CORS middleware pre-joins allowed methods and headers at factory time instead of on every request
- `SecHeaders` middleware pre-computes resolved header pairs at factory time, eliminating per-request branching and `Object.entries` allocation
- `Context.setHeader('Set-Cookie', ...)` now appends to an internal array instead of overwriting, preserving all Set-Cookie values when multiple cookies are set in a single response
- `Context.setHeaders()` routes Set-Cookie entries through the same append path and validates the entire batch atomically (all-or-nothing) instead of applying partial state when an invalid entry is encountered
- `Redirect.buildResponse()` applies Location header after extra headers, preventing caller-supplied headers from overriding the redirect target
- CORS middleware sets `Vary: Origin` on all origin-bearing requests regardless of whether the origin matched, preventing CDN cache poisoning across different origins
- CORS middleware throws at configuration time when `credentials: true` is combined with wildcard `origin: '*'`
- CORS single-string `origin` now matches only when it equals the request `Origin`, behaving identically to the single-element array form instead of reflecting the allow-origin to any requester
- `Redirect.buildResponse()` rejects any status that is not 301, 302, 303, 307, or 308, so a `Location` header can never ride a non-redirect response
- `BodyLimit` rejects a non-finite or non-positive `limit` at creation, refusing to start with body-size protection silently disabled
- `BodyLimit` forwards body-forbidden methods (TRACE, CONNECT, TRACK) untouched to routing instead of throwing while rebuilding the request, so they reach a clean 405 rather than a 500
- `Response.create()` rejects a body-forbidden status (101, 204, 205, 304) paired with a body and an out-of-range or non-integer status before the `Response` constructor can throw, turning both into a clear 400 instead of a 500
- `Context.parseCookies()` trims only space and tab from cookie names per RFC 6265bis, so a non-breaking-space prefix can no longer normalize into and shadow a legitimate cookie
- `Worker.createPool()` rejects a non-finite `poolSize` and floors a fractional one, so the pool can never be silently empty
- Response Content-Type chosen by `ctx.send.json/text/html` now wins over a generic context Content-Type, while an explicit per-call header still overrides
- `ctx.body()` selects its parser by the canonical media type matched case-insensitively, so `APPLICATION/JSON` parses as JSON and a parameter token can no longer masquerade as the media type
- WebSocket middleware normalizes trailing slashes on the listener path and uses exact segment matching (`path + '/'` prefix) instead of bare `startsWith`, preventing unintended path overlap
- Session middleware enforces a minimum 32-character `cookieSecret` length at configuration time
- Session middleware validates `maxAge` is a positive finite number, `path` is non-empty, and rejects `SameSite=None` without `secure: true`
- Session middleware embeds a server-side issued-at timestamp in signed payloads and validates token age against `maxAge` during decode, ensuring consistent expiry enforcement independent of client cookie handling
- Session middleware caches the imported HMAC `CryptoKey` via a lazy closure instead of re-importing on every request
- Session cookie defaults to `Secure: true`, `HttpOnly: true`, `SameSite: Lax`, `Path: /`
- BasicAuth middleware uses constant-time string comparison with length-independent padding to prevent timing side-channel attacks
- BasicAuth middleware accepts credentials where the password portion is empty (colon at position 0 is now valid)
- BodyLimit middleware uses `Number()` instead of `parseInt()` for Content-Length parsing, correctly rejecting non-numeric and partial-numeric values
- SecHeaders middleware applies secure default values (`X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, etc.) when no explicit options are provided
- `Handler.safePositive()` validates numeric configuration values (`maxUrlLength`, `maxRouteParamLength`, `requestTimeoutMs`), falling back to defaults when zero, negative, NaN, or Infinity is provided
- `Handler.createHandler()` wraps request timeout in an `AbortController` instead of raw `setTimeout`, and cancels the timer in a `finally` block
- `Handler.createHandler()` cancels the response body stream on HEAD requests instead of buffering it
- `Scanner.createPattern()` rejects filenames containing multiple dots (e.g. `foo.test.ts`) to prevent test and config files from being registered as routes
- `Context.parseCookies()` trims whitespace from cookie keys during parsing and keeps first-wins semantics per RFC 6265
- `Context.query()` returns the first value for duplicate query parameters instead of the last
- Cookie, query, and header maps are built with `Object.create(null)` (null-prototype) so attacker-controlled key names can never shadow or collide with `Object.prototype` members
- `Context.responseHeadersMap` getter returns an immutable snapshot instead of the live internal header object, so external reads cannot mutate the headers actually sent to the client
- `Context.body()` formData parsing now catches malformed multipart payloads and returns null instead of crashing the request pipeline
- `Response.sanitizeFilename()` strips control characters (ASCII 0-31 and 127), quotes, backslashes, and path separators from download filenames
- `Error.buildResponse()` returns generic status text for unmapped HTTP status codes instead of forwarding the raw error message to clients
- `Error.defaultErrorHtml()` escapes special characters in error messages rendered into HTML error pages

#### Performance

- `Static.serveStaticFile()` defers `Deno.open` until after the 304 cache check, eliminating wasted file descriptors on cache hits
- `Static` ETag generation uses a deterministic fallback (`mtime ?? 0`) to prevent hash collisions when file modification time is unavailable
- `Engine` compile cache layer consolidated: removed dead `fileCache` that was never hit, inlining `Deno.readTextFile` directly
- `Engine` `TextEncoder` and `Static` `TextEncoder` moved to static singletons, matching the `Session.encoder` pattern
- `Response.sanitizeFilename()` reduced from four regex passes to two, with patterns centralized in `Constant.ts`
- `Response.toRecord()` and `Redirect.buildResponse()` guard against empty-object allocation when optional headers are undefined
- `routing/Handler` hoists `workerPool`, `viewEngine`, and a pre-created `workerHandle` to factory scope, eliminating per-request property lookups and object allocations
- `routing/Handler.executeMiddlewares()` inlines path matching inside the `next()` loop with a `while` + `continue`, removing per-request `.filter()` allocation
- `Utils.lookup()` rewritten as zero-allocation single-pass dotted path resolution using `indexOf` + `charCodeAt`
- `Scanner.validateModule()` reduced from two-pass iteration to a single pass over HTTP methods
- `Context` `requestState` double initialization removed
- `Worker` round-robin index reset uses modular arithmetic to prevent precision loss at `Number.MAX_SAFE_INTEGER`
- `Session` base64url encoding uses pre-allocated `Uint8Array` with `for` loop instead of intermediate iterable
- `Static` ETag hex generation uses single-pass `for` loop instead of 32-element intermediate array
- `SecHeaders` middleware pre-computes resolved `[name, value]` pairs at factory time, zero branching per request
- CORS middleware pre-joins allowed methods, headers, max-age, and exposed headers at factory time
- `Static` pre-resolves absolute path at registration time, removing `Deno.cwd()` and `isAbsolute` from the per-request path

#### Code Quality

- All internal `console.*` logging removed in favor of the observability event bus, leaving log routing entirely to the developer
- `@neabyte/stackz` dependency removed now that stack-trace formatting is no longer logged internally
- `Response.sanitizeFilename()` replaced by `Response.contentDisposition()`, which builds the complete header value rather than a quoted-string fragment
- `Helper.ts` and `Error.ts` merged into `Handler.ts` as the single source of truth for `toRecord`, `escapeHtml`, `safeMessage`, and `errorResponse`
- All scattered static readonly data (`encoder`, `decoder`, regexes, defaults, maps) centralized into `Constant.ts`
- `Context.handleError()` and `Handler.handleResponse()` catch unified to use `Constant.serverErrorMessages` for accurate status text across all error paths
- `Context.handleError()` fallback and `Handler.handleResponse()` catch no longer expose raw error messages for 4xx responses, using generic status text instead
- Module-level `encoder` and `decoder` variables in Session moved into the class as `private static readonly` properties
- `Response.ts` extracts `applyCookies()` and `mergedHeaders()` helpers to eliminate duplicated header-merge logic
- `Handler.ts` extracts `safePositive()` helper for numeric option validation
- `Helper.toRecord()` simplified to `Object.fromEntries()` directly
- All `Object.hasOwnProperty` calls replaced with `Object.hasOwn()`
- All `parseInt()` calls for numeric coercion replaced with `Number()`
- Variable names across middleware and routing files updated to follow 2+ word naming convention (e.g. `err` to `statusError`, `value` to `headerValue`, `raw` to `rawListener`)
- Method names shortened to 3-word maximum: `setErrorResponseBuilder` to `setErrorBuilder`, `buildUriTooLongResponse` to `buildUriTooLong`, `isIdentifierStartChar` to `isIdentStart`, `ensureBodyNotConsumed` to `guardBodyUse`, `buildClearCookieHeader` to `clearCookieHeader`, `buildSetCookieHeader` to `setCookieHeader`, `renderNodeToChunk` to `renderChunk`, `renderNodesToStream` to `renderStream`
- Private static properties in `SecHeaders` and `Session` sorted alphabetically
- `ExtractedError` and `StatusCodeCarrier` derived from a single `StatusCarrier<S>` atom instead of repeating the `statusCode` shape
- JSDoc briefs trimmed to 6-word maximum and descriptions to 9-word maximum

#### Public API

- `src/index.ts` changed from `export *` (which leaked all internal classes) to named exports: `Router`, `Context`, `Mware`, `WrapMware`, and all type declarations
- `router.on(listener)` added as the single public tap for the observability event bus
- `WebSocketOptions` gains an optional `allowedOrigins` field accepting an exact allowlist or `'*'` opt-out
- `WorkerPoolOptions` gains an optional `taskTimeoutMs` field bounding how long a single worker task may run before its slot is reclaimed
- `Context.streamRender()` and `ViewEngine.streamRender()` are now async (return a `Promise`), so a missing or uncompilable template surfaces before the response status is committed
- `process:error` added to the observability `Event` union, carrying the fault `origin` (`unhandledrejection`, `uncaughterror`, or `process:exit`) and the raw `Error`

### Fixed

- `Context.query()` first-wins semantics now match RFC 3986 and server-side convention, preventing parameter shadowing when duplicate keys appear in the query string
- `Context.parseCookies()` first-wins semantics now match RFC 6265, preventing cookie value overwrite from duplicate keys
- `Error.buildResponse()` no longer includes raw runtime details in responses for status codes outside the common mapped set
- `Redirect.buildResponse()` no longer accepts non-redirect status codes (only 301, 302, 303, 307, 308 are valid)
- `Handler.createHandler()` HEAD requests no longer hang waiting for a response body that is never sent
- CORS preflight responses use `ctx.send.custom(null, { status: 204 })` instead of `ctx.handleError(204, ...)`, which previously caused Deno to throw on null-body status codes
- WebSocket listener path `/ws` no longer incorrectly matches requests to `/ws-admin` or other paths sharing the same prefix
- Static routes used to answer any verb, so a POST or DELETE to a static path quietly returned the file. They now register on GET only, and other verbs correctly receive 405 Method Not Allowed
- Malformed request body payloads (JSON, formData, text, arrayBuffer, blob) now produce 400 Bad Request instead of 500 Internal Server Error
- `ctx.body()` re-throws status-bearing errors (e.g. body-limit 413) instead of silently returning null
- We found that a bad response header value could slip past the pipeline and surface as a bare 500 with no protections. Now the error path rebuilds the response from hardened defaults so the request stays masked and safe
- `Handler.errorResponse()` send path wrapped in try/catch so malformed accumulated headers cannot bypass the framework pipeline
- `Context.setHeader()` and `Context.setHeaders()` reject invalid names and values immediately instead of deferring failure to response construction
- `Engine` #each parent-scope variables now resolve correctly inside nested loops after the prototype-chain exclusion fix
- Standard `Deno.errors.*` thrown by developers or internal paths now map to semantically correct HTTP status codes instead of collapsing to 500
- A request could craft cookie, query, or header names that collided with built-in object keys and quietly confused the parsed maps. Those maps are now built without a prototype, so such names are treated as plain data and can no longer cause trouble
- A refactor had quietly turned the `Context.responseHeadersMap` reader into a window onto the live internal headers, so anything that touched the returned map could reshape the real response. The reader now hands back an immutable snapshot, keeping the outgoing headers exactly as intended
- A single task that threw inside a worker used to take the whole server down with it. Now that failure is contained to a masked 500, the server keeps serving, and the worker slot quietly recovers on its own so later requests are never left hanging
- A handler that handed back something other than a real response, or a middleware that forgot to continue the chain, used to slip out of the framework untouched and surface as a bare error with none of the usual protections. Those returns are now caught at the boundary and routed back through the safe error path, masked and fully protected
- The same gap lived on in the custom error handler, where a reply that was not a real response could still escape and strip away the safeguards meant to cover failures. That last path now holds to the same contract as the rest, so anything unexpected quietly falls back to the safe, protected error page
- Registering a broken middleware or a malformed static configuration used to look fine at startup and only fall apart later on real traffic. The framework now checks these at the moment you register them and refuses clearly, so the mistake is caught where it is made rather than deep in a request
- When a request ran out of time, the resulting timeout used to pass by completely unseen by anyone watching the server. That moment now reports itself through the same channel as every other error, so a timeout can finally be noticed, alerted on, and traced
- A documented way to read and write per-request state had quietly disappeared in an earlier refactor, so following the official guides led straight into a masked error on the very routes that needed it most. The accessor is restored and behaves exactly as the docs describe, with the type-safe helpers living alongside it
- Serving a download whose name carried everyday accented or non-Latin characters used to fail outright. Such names are now encoded the standard way so they arrive intact, while the plain fallback and every existing safeguard around the filename stay in place
- A single worker task that never finished used to quietly tie up its slot for good, so every later piece of work routed to that slot just piled up behind it and waited forever. Each task is now given a deadline, and when one overruns it the slot is reclaimed and freshly replaced so the next request runs as normal
- Reading an own property off a string inside a template, like the length of a value or a character at a position, used to come back empty even though the same patterns worked on arrays. String values now expose their own data the same way, while their methods and prototype remain out of reach
- Starting a pure middleware or API app with no `./routes` directory used to crash the server at boot because the file watcher threw on the missing path. We now skip watching a directory that does not exist, so the server boots cleanly and hot reload still kicks in once the directory is there
- `ctx.streamRender('does-not-exist')` used to answer a silent 200 with an empty body while the non-streaming `ctx.render()` correctly returned 404 for the same typo. Streaming now resolves and compiles the template before committing the response, so a missing or broken template is a proper 404 or 400 just like `render`
- Misconfiguring `bodyLimit({ limit })` with `NaN`, `Infinity`, or a non-positive value used to be accepted silently and then enforce nothing, shipping the server with body-size protection turned off. We now reject a non-finite or non-positive limit at creation so the mistake is a loud crash at wiring time
- A `TRACE`, `CONNECT`, or `TRACK` request hitting a route behind `bodyLimit` used to come back as a 500 because rebuilding the request to wrap its body threw on those methods. We now only wrap a body the method can actually carry, so those verbs reach routing and get a clean 405
- `ctx.send.json(data, { status: 204 })` and other null-body statuses (101, 205, 304) used to crash into a 500 because the body and the status disagreed. The send helpers now drop the body when the chosen status forbids one, so the intended bodiless response is what goes out
- `ctx.send.*` with an out-of-range or non-integer status (99, 600, NaN, 3.5) used to surface the constructor's raw error as a masked 500. We now validate the status up front and return a clear 400 instead
- A cookie name prefixed with a non-breaking space used to be normalized down by `trim()` so an attacker's `\xA0session` could shadow the real `session`. We now trim only the space and tab the spec allows, so such a name stays distinct and can never override a legitimate cookie
- `ctx.redirect(url, status)` used to attach a `Location` header to any status, so a dynamically computed `200` or `404` produced a malformed redirect. We now reject any status that is not a real 3xx redirect, returning a clear 400 instead
- The single-string `cors({ origin: 'https://trusted' })` form used to set `Access-Control-Allow-Origin` for every requester, unlike the array form. Both forms now match only when the configured origin equals the request `Origin`, so a non-matching requester gets a 403 and no allow-origin
- `Worker.createPool({ poolSize: NaN })` used to build an empty pool that rejected every task, and `Infinity` threw a raw `RangeError`. We now reject a non-finite pool size at creation and floor a fractional one, so the pool is never silently dead
- A `405` response used to omit `HEAD` from its `Allow` header even though the server serves HEAD for every GET route. The advertised methods now always include HEAD wherever GET is supported, so the `Allow` set matches what the server actually serves
- `ctx.param('id')` used to return the raw, still-encoded path segment while `ctx.query()` returned decoded values. Route params are now percent-decoded once on the way in, so `/users/john%20doe` reads back as `john doe`, with a safe fallback to the raw value on malformed encoding
- Setting `Content-Type` generically on the context used to silently override the body type chosen by `ctx.send.json/text/html`, so JSON could go out labeled as XML. The helper's own type now wins over a generic context header, while an explicit per-call header still overrides
- Returning a native `Response` from a handler used to drop every header and cookie the middleware chain accumulated, so security headers vanished and a freshly issued session cookie never reached the client. A raw return now carries the accumulated headers and `Set-Cookie` values, with the handler's own explicit headers kept authoritative
- `ctx.body()` used to pick its parser with a case-sensitive substring scan of Content-Type, so `APPLICATION/JSON` was mis-parsed as text and `text/html; z=application/json` was wrongly parsed as JSON. We now match the canonical media type case-insensitively, so the parser follows the type the client actually declared
- A long-running worker pool used to leak memory because each task chained onto the previous one, keeping an ever-growing list of settled promises alive. The per-slot serialization now uses a detached gate that holds no reference to past tasks, so memory stays flat under steady load while order and crash recovery are unchanged
- A single unhandled promise rejection or uncaught error from any handler used to terminate the whole process, taking down every service sharing it. A process-level sentinel now catches those faults, keeps the server alive, and surfaces each as a `process:error` event so it is logged rather than fatal
- A handler calling a native termination API (`Deno.exit`, `process.exit`, `process.abort`, `process.reallyExit`, or a self-targeted `Deno.kill`/`process.kill`) used to kill the whole server outright, bypassing every safety net. Those calls from application code are now blocked and reported as a `process:error`, while a kill aimed at another PID still goes through for legitimate subprocess management
- A malformed WebSocket handshake (e.g. a missing `Sec-WebSocket-Key`) used to come back as a 500 because the upgrade threw an unmapped error. A failed upgrade is always a client problem, so we now return a clean 400 and the real cause still reaches the logged error event
- A non-GET request (POST, PUT, etc.) carrying an `Upgrade: websocket` header used to be upgraded anyway, shadowing the real same-path HTTP route and bypassing its method and auth checks. Only GET can open a handshake now, so any other method falls through to normal routing
- Basic Auth matched the `Basic` scheme case-sensitively, so a valid client sending `basic` or `BASIC` was wrongly rejected. The scheme token is now matched case-insensitively per RFC 7235, while the credential check stays constant-time and unchanged
- A fault during request setup (before the per-request try block) could reject straight to the runtime, producing a bare 500 with no logging. The outer handler is now fully wrapped, so every request emits its completion event and returns a masked, security-header-protected response no matter where it fails

---

## [0.11.0] - 2026-06-04

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
- VitePress config cleanup and documentation code blocks changed from `` ```dve `` to `` ```html ``
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

[Unreleased]: https://github.com/NeaByteLab/Deserve/compare/v0.11.0...HEAD
[0.11.0]: https://github.com/NeaByteLab/Deserve/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/NeaByteLab/Deserve/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/NeaByteLab/Deserve/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/NeaByteLab/Deserve/compare/v0.7.0...v0.8.0
