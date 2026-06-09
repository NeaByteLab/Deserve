---
description: "Why Deserve ships with zero third-party dependencies and relies only on the Deno standard runtime."
---

# Zero Dependency

Deserve runs on the Deno runtime and nothing from npm. There is no `node_modules/` folder to install, audit, or worry about.

## Why It Matters

Node's biggest scar is the supply chain. A fresh project pulls in hundreds of transitive packages, and any one of them can ship a compromised update overnight. That risk still haunts `node_modules/` every single day, and most teams never read the code they install.

Deserve takes the other path. It builds on what Deno already provides and keeps the dependency tree out of the picture, so there is no npm registry in the loop and far less surface for a supply chain attack to land on. Less to trust means less that can break.

## Following Deno's Vision

Deno was designed around safer defaults, and this choice follows that lead. The runtime brings rich request handling, file watching, and security primitives out of the box, so reaching for an npm package is rarely the answer. The industry is moving toward caring more about the people who use the software, and shipping fewer moving parts is part of that care.

## Secure by Default

Security should be the starting point, not a later upgrade. That belief is not a promise of perfection, it is a direction. A smaller dependency tree, [process protection](/getting-started/server-configuration#process-protection), and [layered error handling](/error-handling/defense-in-depth) all point the same way, toward a server that stays safe even when something goes wrong.

## Open and Auditable

Every module that Deserve does rely on is open source and published on [JSR](https://jsr.io/), so the code is there to read, audit, and contribute to. Transparency is the point. Nothing hides behind a minified bundle, and anyone can check exactly what runs.

This pairs with the rest of the [philosophy](/core-concepts/philosophy): keep it simple, build on the platform, and stay honest about the trade-offs.
