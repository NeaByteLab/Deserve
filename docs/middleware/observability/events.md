---
description: "Reference of every lifecycle, security, request, and fault event emitted by a serving Deserve router."
---

# Event Reference

Every event from [`router.on()`](/middleware/observability/overview) carries a `kind` discriminant and a `metadata` object. This page lists each kind and the fields it provides.

![A request event is external by default but becomes internal when a timeout, a framework error, or a missing context produced it, while every other non-request kind is internal except process:failed which always stays external, so routing on the type field keeps normal client traffic out of the fault alert channel](/diagrams/obs-event-channel.png)

## Server

| Kind             | Metadata           |
| ---------------- | ------------------ |
| `server:started` | `port`, `hostname` |
| `server:stopped` | none               |

`server:started` fires once the server binds. `server:stopped` fires after the server stops draining.

## Routes

| Kind            | Metadata          |
| --------------- | ----------------- |
| `route:added`   | `path`, `pattern` |
| `route:updated` | `path`, `pattern` |
| `route:removed` | `path`, `pattern` |
| `route:ignored` | `path`, `reason`  |
| `route:failed`  | `path`, `error`   |

`route:added` fires when a route file loads, `route:updated` when [hot reload](/core-concepts/hot-reload) picks up a change, and `route:removed` when a file disappears. `route:ignored` names a file that was skipped and why, while `route:failed` carries the error when a route fails to load.

## Views

| Kind               | Metadata             |
| ------------------ | -------------------- |
| `view:compiled`    | `path`, `durationMs` |
| `view:rendered`    | `path`, `durationMs` |
| `view:invalidated` | `paths`              |
| `view:failed`      | `path`, `error`      |

View events come from the [DVE rendering engine](/rendering/). `view:invalidated` fires when a template change clears cached output, carrying every affected path.

## Workers

| Kind               | Metadata                                                             |
| ------------------ | -------------------------------------------------------------------- |
| `worker:timeout`   | `index`, `timeoutMs`, `error`                                        |
| `worker:crashed`   | `index`, `error`                                                     |
| `worker:respawned` | `index`                                                              |
| `worker:rejected`  | `reason` (`queue-depth`, `queue-wait`), `queueDepth`, `maxQueueDepth` |

`worker:timeout` fires when a task passes its deadline, `worker:crashed` when a worker dies mid-task, and `worker:respawned` when the freed slot is replaced. `worker:rejected` fires when a dispatch is turned away under load, with `reason` saying whether the queue depth or the projected wait tripped the limit. These come from the [worker pool](/recipes/worker-pool).

## Security Middleware

| Kind                 | Metadata                                                  |
| -------------------- | --------------------------------------------------------- |
| `session:invalid`    | `cookieName`, `reason` (`tampered`, `expired`, `malformed`) |
| `csrf:failed`        | `rule` (`origin`, `secFetchSite`), `error`                |
| `cors:blocked`       | `origin`                                                  |
| `auth:failed`        | `reason` (`missing`, `malformed`, `invalid`)              |
| `ip:denied`          | `ip`                                                      |
| `validate:failed`    | `source` (`body`, `cookies`, `headers`, `query`), `reasons` |
| `body:rejected`      | `limit`, `declared`                                       |
| `websocket:rejected` | `reason` (`origin`, `version`, `malformed`)               |
| `static:missing`     | `path`                                                    |

Each security event pairs with its middleware and fires the moment the check refuses a request:

- `session:invalid` fires when a signed cookie fails to decode, with `reason` naming a tampered value, one aged past `maxAge`, or a malformed one, while the request continues with no session attached. It comes from the [session middleware](/middleware/session).
- `csrf:failed` fires when a CSRF rule throws, naming which rule broke while the check still falls safe to a refusal. It comes from the [CSRF middleware](/middleware/csrf).
- `cors:blocked` fires when an origin is refused, carrying that origin. It comes from the [CORS middleware](/middleware/cors).
- `auth:failed` fires on a rejected login, with `reason` naming a missing header, a malformed one, or wrong credentials. It comes from the [basic auth middleware](/middleware/basic-auth).
- `ip:denied` fires when an address is blocked, carrying the denied IP. It comes from the [IP restriction middleware](/middleware/ip).
- `validate:failed` fires when a contract rejects input, naming the `source` and the `reasons`. It comes from [validation](/middleware/validation/overview).
- `body:rejected` fires when a declared body exceeds the cap, carrying the `limit` and the `declared` size. It comes from the [body limit middleware](/middleware/body-limit).
- `websocket:rejected` fires on a refused handshake, with `reason` naming a bad origin, a version mismatch, or a malformed upgrade. It comes from the [WebSocket middleware](/middleware/websocket).
- `static:missing` fires when a static path resolves to no file, carrying that path.

## Requests

| Kind                | Metadata                                             |
| ------------------- | ---------------------------------------------------- |
| `request:completed` | `method`, `statusCode`, `url`, `durationMs`, metrics |
| `request:failed`    | same as `request:completed`, plus an optional `error` |

`request:completed` fires for every finished request. `request:failed` fires in addition whenever the status is `400` or higher, and carries `error` only when a framework error produced the failure. Both carry optional OpenTelemetry-aligned metrics when known: `route`, `serverAddress`, `serverPort`, `userAgent`, `requestSize`, `responseSize`, and `ip`.

Turn these into a log in [Request Logging](/middleware/observability/logging).

## Process

| Kind             | Metadata                                                                                |
| ---------------- | --------------------------------------------------------------------------------------- |
| `process:failed` | `error`, `origin` (`unhandledrejection`, `uncaughterror`, `process:exit`, `process:signal`) |

A serving router traps unhandled rejections, uncaught errors, and attempts to terminate the process. Each fault becomes a `process:failed` event rather than crashing the server, so a single failure never takes the process down. A blocked termination call carries `origin: 'process:exit'` and names the call, for example `Blocked Deno.exit(0) process termination is not permitted from application code`. See [Process Protection](/getting-started/server-configuration#process-protection) for the reasoning, and capture these in [Error Reporting](/middleware/observability/errors).
