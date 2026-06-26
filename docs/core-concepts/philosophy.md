---
description: "The design philosophy behind Deserve: convention over configuration, zero dependencies, and Deno-native ergonomics."
---

# Philosophy

Building a server should feel light, not like solving a puzzle before the first route even runs. That feeling is the reason Deserve exists.

## The Journey

Like many developers, I spent years across the JavaScript ecosystem, jumping between frameworks for every new idea. [Express](https://github.com/expressjs/express) was my home base, simple and familiar, and I shipped countless projects on it. Then Deno arrived, and something clicked.

Deno gives you a rich native runtime, yet rich can quietly turn into heavy. Config files in one corner, route registrations in another, middleware wiring scattered everywhere. I wanted a way to build on Deno that stayed as small as the problem in front of me, so Deserve started as the framework I wished already existed.

## Core Beliefs

These four beliefs shape every decision in the framework, and each one connects to a feature you can reach today.

![Each of the four core beliefs maps to a concrete feature you can reach today, where fewer moving parts leads to zero dependency, structure is the API leads to file-based routing, build on the platform leads to native HTTP and streams, and experience that scales leads to built for teams](/diagrams/philosophy-beliefs-to-features.png)

![An abstract view of how the beliefs think as one mind, where a single root idea of staying as small as the problem feeds all four beliefs, the beliefs reinforce one another down the chain, and together they converge on the conclusion that simple is safe because less code means less that can go wrong](/diagrams/philosophy-principle-web.png)

### Fewer Moving Parts

The smallest dependency tree is the one that cannot break. Deno already ships request handling, file watching, and security primitives, so leaning on the runtime beats pulling another package. That is why Deserve runs with [zero npm dependencies](/core-concepts/zero-dependency), keeping the surface small enough to actually trust.

### Structure Is the API

A folder layout already describes intent, so it should be the routing too. No registration step, no central table to keep in sync, just files that map straight to URLs through [file-based routing](/core-concepts/file-based-routing). The shape of the project is the shape of the API.

### Build on the Platform

When the runtime hands you something solid, use it instead of rebuilding it. Deserve wraps Deno's native HTTP, streams, and workers rather than hiding them, so the platform stays close and predictable underneath every handler.

### Experience That Scales

Code should read cleanly, patterns should stay predictable, and errors should point somewhere useful. That care holds whether one person is hacking on a weekend or a whole team is shipping together, which is what makes Deserve [built for teams](/getting-started/built-for-teams) from the first commit.

## Safe by Default

Simple and safe belong in the same sentence. A serving router protects the process from accidental shutdown through [process protection](/getting-started/server-configuration#process-protection), and faults are caught in layers through [defense in depth](/error-handling/defense-in-depth). Staying small is part of staying safe, since less code means less that can go wrong.

Staying safe also means staying current. Attack surfaces keep shifting, so each release tracks them and ships the fixes alongside the features. A new version is rarely just new capabilities, it usually carries most of the attack vectors patched from the version before it, which makes running the latest the safe choice rather than the optional one. Keeping the dependency current is one command with [`deno update`](https://docs.deno.com/runtime/reference/cli/update/), where `deno update --latest` pulls the newest release regardless of semver so the patches reach the moment they ship.

## Small on Purpose

Deserve is not here to replace the big frameworks or win a benchmark war. It is a tool for developers who love how light Deno feels and want to keep that feeling all the way to production.

Sometimes the best solution is the simple one. Sometimes that simple solution does not exist yet, so it is worth building one and sharing it openly.
