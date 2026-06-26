---
description: "Install Deserve into a Deno project using the JSR package registry."
---

# Installation

Add Deserve to a Deno project in one command, then move on to the ideas behind it in [Core Concepts](/core-concepts/philosophy), starting with the [philosophy](/core-concepts/philosophy) and [zero dependency](/core-concepts/zero-dependency) approach.

## Prerequisites

- [Deno](https://github.com/denoland/deno_install) 2.8.3+ installed

Staying on the latest Deno release is a good idea, since Deserve runs on the runtime and every performance update to Deno carries straight through to Deserve.

## Install Deserve

[Deno's package manager](https://docs.deno.com/runtime/reference/cli/add/) adds Deserve to the project. This command writes the dependency into `deno.json` and generates `deno.lock`:

::: code-group

```bash [deno]
deno add jsr:@neabyte/deserve
```

:::

The command does three things:

- Adds Deserve to the `deno.json` imports
- Creates or updates the `deno.lock` file
- Makes Deserve available for import

With Deserve installed, the [Quick Start](/getting-started/quick-start) builds a first server and route, and [File-based Routing](/core-concepts/file-based-routing) explains how the folder structure becomes the API.
