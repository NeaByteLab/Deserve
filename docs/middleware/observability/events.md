---
description: "Reference of all lifecycle and error events emitted by a serving Deserve router."
---

# Event Reference

Every event from [`router.on()`](/middleware/observability/overview) carries a `kind` discriminant and a `metadata` object. This page lists each kind and the fields it provides.

![A request event is external by default but becomes internal when a timeout, a framework error, or a missing context produced it, while every non-request kind is always internal, so routing on the type field keeps normal client traffic out of the fault alert channel](/diagrams/obs-event-channel.png)

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

## Workers

| Kind              | Metadata                                          |
| ----------------- | ------------------------------------------------- |
| `worker:timeout`  | `workerIndex`, `timeoutMs`, `error`               |
| `worker:crash`    | `workerIndex`, `error`                            |
| `worker:respawn`  | `workerIndex`                                     |
| `worker:rejected` | `reason` (`queue-depth`, `queue-wait`), `queueDepth`, `maxQueueDepth` |

`worker:timeout` fires when a task passes its deadline, `worker:crash` when a worker dies mid-task, and `worker:respawn` when the freed slot is replaced. `worker:rejected` fires when a dispatch is turned away under load, with `reason` saying whether the queue depth or the projected wait tripped the limit. These come from the [worker pool](/core-concepts/worker-pool).

## Middleware

| Kind              | Metadata                                          |
| ----------------- | ------------------------------------------------- |
| `session:invalid` | `cookieName`, `reason` (`tampered`, `expired`, `malformed`) |
| `csrf:rule-error` | `rule` (`origin`, `secFetchSite`), `error`        |

`session:invalid` fires when a signed cookie fails to decode, with `reason` naming whether the value was tampered with, aged past `maxAge`, or was malformed, while the request continues with no session attached. It comes from the [session middleware](/middleware/session). `csrf:rule-error` fires when a custom CSRF rule throws, naming which rule broke while the check still falls safe to a refusal. It comes from the [CSRF middleware](/middleware/csrf).

## Requests

| Kind                | Metadata                                            |
| ------------------- | --------------------------------------------------- |
| `request:complete`  | `method`, `statusCode`, `url`, `durationMs`, metrics |
| `request:error`     | same as `request:complete`, plus an optional `error` |

`request:complete` fires for every finished request. `request:error` fires in addition whenever the status is `400` or higher, and carries `error` only when a framework error produced the failure. Both carry optional OpenTelemetry-aligned metrics when known: `route`, `serverAddress`, `serverPort`, `userAgent`, `requestSize`, `responseSize`, and `ip`.

Turn these into a log in [Request Logging](/middleware/observability/logging).

## Process

| Kind            | Metadata                                                              |
| --------------- | -------------------------------------------------------------------- |
| `process:error` | `error`, `origin` (`unhandledrejection`, `uncaughterror`, `process:exit`) |

A serving router traps unhandled rejections, uncaught errors, and attempts to terminate the process. Each fault becomes a `process:error` event rather than crashing the server, so a single failure never takes the process down. A blocked termination call carries `origin: 'process:exit'` and names the call, for example `Blocked Deno.exit(0) — process termination is not permitted from application code`. See [Process Protection](/getting-started/server-configuration#process-protection) for the reasoning, and capture these in [Error Reporting](/middleware/observability/errors).
