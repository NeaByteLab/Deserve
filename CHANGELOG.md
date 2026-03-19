# Changelog

All notable changes to Deserve. Full commit history in chronological order.

Format inspired by [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Changed

- Remove `ViewEngine.render` options parameter
- Parse `{{else}}`, `{{/if}}`, and `{{/each}}` strictly
- Throw on unclosed `#if` and `#each` blocks

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

[Unreleased]: https://github.com/NeaByteLab/Deserve/compare/v0.9.0...HEAD
[0.9.0]: https://github.com/NeaByteLab/Deserve/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/NeaByteLab/Deserve/compare/v0.7.0...v0.8.0
