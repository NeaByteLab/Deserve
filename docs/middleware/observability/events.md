---
description: "Reference of all lifecycle and error events emitted by a serving Deserve router."
---

# Event Reference

Every event from [`router.on()`](/middleware/observability/overview) carries a `kind` discriminant and a `metadata` object. This page lists each kind and the fields it provides.

## Server

| Kind                | Metadata                  |
| ------------------- | ------------------------- |
| `server:listening`  | `port`, `hostname`        |
| `server:shutdown`   | none                      |

`server:listening` fires once the server binds. `server:shutdown` fires after the server stops draining.

## Routes

| Kind             | Metadata                          |
| ---------------- | --------------------------------- |
| `route:loaded`   | `routePath`, `pattern`            |
| `route:reloaded` | `routePath`, `pattern`            |
| `route:removed`  | `routePath`, `pattern`            |
| `route:skipped`  | `routePath`, `reason`             |
| `route:error`    | `routePath`, `error`              |
| `reload:error`   | `routePath`, `error`              |

Reload events come from hot reload as files change on disk.

## Views

| Kind             | Metadata                  |
| ---------------- | ------------------------- |
| `view:compiled`  | `path`, `durationMs`      |
| `view:rendered`  | `path`, `durationMs`      |
| `view:refreshed` | `paths`                   |
| `view:error`     | `path`, `error`           |

View events come from the [DVE rendering engine](/rendering/).

## Requests

| Kind                | Metadata                                            |
| ------------------- | --------------------------------------------------- |
| `request:complete`  | `method`, `statusCode`, `url`, `durationMs`, metrics |
| `request:error`     | same as `request:complete`, plus `error`            |

`request:complete` fires for every finished request. `request:error` fires in addition whenever the status is `400` or higher. Both carry optional OpenTelemetry-aligned metrics when known: `route`, `serverAddress`, `serverPort`, `userAgent`, `requestSize`, `responseSize`, and `ip`.

Turn these into a log in [Request Logging](/middleware/observability/logging).

## Process

| Kind            | Metadata                                                              |
| --------------- | -------------------------------------------------------------------- |
| `process:error` | `error`, `origin` (`unhandledrejection`, `uncaughterror`, `process:exit`) |

A serving router traps unhandled rejections, uncaught errors, and attempts to terminate the process. Each fault becomes a `process:error` event rather than crashing the server, so a single failure never takes the process down. A blocked termination call carries `origin: 'process:exit'` and names the call, for example `Blocked Deno.exit(0) - process termination is not permitted from application code`. See [Process Protection](/getting-started/server-configuration#process-protection) for the reasoning, and capture these in [Error Reporting](/middleware/observability/errors).
