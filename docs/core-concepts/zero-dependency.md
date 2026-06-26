---
description: "Why Deserve ships with zero third-party dependencies and relies only on the Deno standard runtime."
---

# Zero Dependency

Deserve runs on the Deno runtime and nothing from npm. There is no `node_modules/` folder to install, audit, or worry about.

## Why It Matters

Node's biggest scar is the supply chain. A fresh project pulls in hundreds of transitive packages, and any one of them can ship a compromised update overnight. That risk still haunts `node_modules/` every single day, and most teams never read the code they install.

Deserve takes the other path. It builds on what Deno already provides and keeps the dependency tree out of the picture, so there is no npm registry in the loop and far less surface for a supply chain attack to land on. Less to trust means less that can break.

![A Node project pulls app code through the npm registry into hundreds of transitive dependencies where any update can be hostile, while a Deserve project uses only the Deno runtime and a few audited JSR modules](/diagrams/zero-dep-supply-chain.png)

## Following Deno's Vision

Deno was designed around safer defaults, and this choice follows that lead. The runtime brings rich request handling, file watching, and security primitives out of the box, so reaching for an npm package is rarely the answer. The industry is moving toward caring more about the people who use the software, and shipping fewer moving parts is part of that care.

![Deserve draws request handling, file watching, security primitives, and permission flags straight from the built-in Deno runtime, so no npm package is needed](/diagrams/zero-dep-runtime-primitives.png)

## Secure by Default

Security should be the starting point, not a later upgrade. That belief is not a promise of perfection, it is a direction. A smaller dependency tree, [process protection](/getting-started/server-configuration#process-protection), and [layered error handling](/error-handling/defense-in-depth) all point the same way, toward a server that stays safe even when something goes wrong.

![A process sentinel interposes known termination calls, so self-targeted Deno.exit and process.exit are blocked and unhandled rejections are trapped while a kill aimed at another pid still passes through, keeping the process alive and emitting a process:failed event](/diagrams/zero-dep-process-guard.png)

## Open and Auditable

Every module that Deserve does rely on is open source and published on [JSR](https://jsr.io/), so the code is there to read, audit, and contribute to. Transparency is the point. Nothing hides behind a minified bundle, and anyone can check exactly what runs.

![What the guard protects against, self termination, uncaught faults, and denial of service, set beside what it does not do, since it is not a sandbox and untrusted code still runs, so it pairs with Deno permission flags and dependency review](/diagrams/zero-dep-best-effort.png)

This pairs with the rest of the [philosophy](/core-concepts/philosophy): keep it simple, build on the platform, and stay honest about the trade-offs.
