# Performance Benchmarks

Benchmarks for the Deserve router + DVE view rendering.

## Setup

- **Load tool**: `autocannon` ([npm](https://www.npmjs.com/package/autocannon))
- **Default config used in this doc**: 500 connections, pipelining 10, duration 30s

## Quick Start

Start a server (from repo root), then run `autocannon` from another terminal.

### Start Server

- **Non-worker mode** (view routes + CPU on main thread):

  ```bash
  deno run --allow-net --allow-read benchmark/main.ts
  ```

- **Worker mode** (enables `/test-worker`):

  ```bash
  deno run --allow-net --allow-read benchmark/main-worker.ts
  ```

- **Listener mode** (one empty event listener attached):

  ```bash
  deno run --allow-net --allow-read benchmark/main-log.ts
  ```

Notes:

- In non-worker mode, **`/test-worker` returns 503** (`worker not enabled`).
- All view routes (`/test-view*`) are available in both modes.
- Listener mode is for measuring observability cost, see [Observability Cost](#observability-cost-logging-on-vs-off).

### Run Benchmark

```bash
npx autocannon http://localhost:8000/test -c 500 -p 10 -d 30
```

## Routes

### JSON + CPU Comparison

| Route          | What it does                             | Why it exists              |
| -------------- | ---------------------------------------- | -------------------------- |
| `/test`        | JSON only (no CPU work)                  | Baseline throughput        |
| `/test-cpu`    | 50k `sqrt` loop on **main thread**       | Event-loop blocking cost   |
| `/test-worker` | Same loop offloaded to a **worker pool** | Offload overhead + scaling |

### DVE View Engine Routes

| Route                  | What it renders                 | Why it exists                |
| ---------------------- | ------------------------------- | ---------------------------- |
| `/test-view`           | Simple variable render          | DVE baseline                 |
| `/test-view-each-meta` | `each` block with metadata      | Loop + expression evaluation |
| `/test-view-include`   | Include + partial               | Composition overhead         |
| `/test-view-expr`      | Optional chaining + expressions | Expression parser/evaluator  |

## Commands (Copy/Paste)

```bash
# JSON Baseline
npx autocannon http://localhost:8000/test -c 500 -p 10 -d 30

# CPU On Main Thread
npx autocannon http://localhost:8000/test-cpu -c 500 -p 10 -d 30

# CPU In Worker (Requires benchmark/main-worker.ts)
npx autocannon http://localhost:8000/test-worker -c 500 -p 10 -d 30

# DVE Views
npx autocannon http://localhost:8000/test-view -c 500 -p 10 -d 30
npx autocannon http://localhost:8000/test-view-each-meta -c 500 -p 10 -d 30
npx autocannon http://localhost:8000/test-view-include -c 500 -p 10 -d 30
npx autocannon http://localhost:8000/test-view-expr -c 500 -p 10 -d 30

# Logging Off vs On (start main.ts, then main-log.ts, same command)
npx autocannon http://localhost:8000/test -c 500 -p 10 -d 30
```

## Test Environment

- **OS**: macOS 26.5
- **Machine**: Apple M3 Pro, 18 GB RAM
- **Config**: 500 connections, pipelining 10, duration 30s

## Results — Deno 2.8.2 (Latest)

2 runs each, non-worker server, same machine and config.

### JSON + CPU (Non-worker)

| Route       | Test 1  | Test 2  | Req/Sec (avg) | Latency (avg) | Total (avg) |
| ----------- | ------- | ------- | ------------- | ------------- | ----------- |
| `/test`     | 150,950 | 148,637 | 149,794       | 32.87 ms      | 4,494k      |
| `/test-cpu` | 22,442  | 22,148  | 22,295        | 223.04 ms     | 669k        |

Takeaway: `/test-cpu` blocks the event loop on the main thread, see [worker mode](#start-server) to move CPU work off-thread.

### Views (DVE Rendering Baseline)

| Route                  | Test 1  | Test 2  | Req/Sec (avg) | Latency (avg) | Total (avg) |
| ---------------------- | ------- | ------- | ------------- | ------------- | ----------- |
| `/test-view`           | 118,026 | 118,323 | 118,175       | 41.81 ms      | 3.55M       |
| `/test-view-each-meta` | 8,522   | 8,530   | 8,526         | 580.44 ms     | 256k        |
| `/test-view-include`   | 103,633 | 106,489 | 105,061       | 47.09 ms      | 3.15M       |
| `/test-view-expr`      | 79,089  | 79,556  | 79,322        | 62.49 ms      | 2.38M       |

## Results — Deno 2.7.7

### JSON + CPU (Non-worker)

| Route       | Test 1  | Test 2  | Test 3  | Req/Sec (avg) | Latency (avg) | Total (avg) |
| ----------- | ------- | ------- | ------- | ------------- | ------------- | ----------- |
| `/test`     | 175,343 | 170,567 | 164,515 | 170,142       | 29 ms         | 5,109k      |
| `/test-cpu` | 25,009  | 24,949  | 24,927  | 24,962        | 199 ms        | 754k        |

### JSON + CPU (Worker-enabled)

| Route          | Test 1  | Test 2  | Test 3  | Req/Sec (avg) | Latency (avg) | Total (avg) |
| -------------- | ------- | ------- | ------- | ------------- | ------------- | ----------- |
| `/test`        | 174,259 | 178,487 | 170,834 | 174,527       | 28 ms         | 5.24M       |
| `/test-cpu`    | 25,133  | 24,833  | 24,773  | 24,912        | 199 ms        | 752k        |
| `/test-worker` | 69,265  | 69,063  | 68,810  | 69,046        | 72 ms         | 2076k       |

Takeaway: `/test-cpu` blocks the event loop, while `/test-worker` moves the same work off-thread.

### Views (DVE Rendering Baseline)

| Route                  | Test 1  | Test 2  | Test 3  | Req/Sec (avg) | Latency (avg) | Total (avg) |
| ---------------------- | ------- | ------- | ------- | ------------- | ------------- | ----------- |
| `/test-view`           | 129,063 | 124,978 | 120,516 | 124,852       | 39.77 ms      | 3.75M       |
| `/test-view-each-meta` | 10,406  | 10,381  | 10,073  | 10,287        | 482.13 ms     | 313k        |
| `/test-view-include`   | 112,115 | 109,558 | 101,886 | 107,853       | 46.02 ms      | 3.24M       |
| `/test-view-expr`      | 96,328  | 94,207  | 82,094  | 90,876        | 54.84 ms      | 2.73M       |

## Observability Cost (Logging On vs Off)

Deserve emits lifecycle events (route, view, worker, request, session, csrf, process).
By default **no listener is attached**, so the request path skips all reporting and
stays cheap. The moment you attach a listener with `router.on(...)`, every request
walks the full reporting path. This section measures that difference on the same
`/test` route.

### How to Reproduce

Off (no listener) uses `benchmark/main.ts`. On uses `benchmark/main-log.ts` with an
empty listener, so the result reflects the framework cost only, not any logging work:

```ts
// benchmark/main-log.ts
import { Router } from '@app/index.ts'

const router = new Router({ routesDir: 'benchmark/routes', viewsDir: 'benchmark/views' })

// Empty listener, observability path active
router.on(() => {})

await router.serve(8000)
```

Run the same load against each server:

```bash
npx autocannon http://localhost:8000/test -c 500 -p 10 -d 30
```

### Results

3 runs each, JSON `/test` route, same machine and config.

| Mode                | Run 1   | Run 2   | Run 3   | Req/Sec (avg) | Latency (avg) |
| ------------------- | ------- | ------- | ------- | ------------- | ------------- |
| Off (no listener)   | 147,434 | 148,492 | 148,949 | 148,292       | 33.21 ms      |
| On (empty listener) | 115,880 | 118,030 | 114,016 | 115,975       | 42.61 ms      |

Attaching a listener drops throughput to about **78%** of the no-listener baseline
and raises average latency from 33 ms to 43 ms. This gap is the framework reporting
cost, measured with no logging in the listener.

### Where the Cost Comes From

The difference has two parts.

#### 1. The listener gate (cheap when off)

The router only does reporting work when a subscriber exists:

```ts
// Skip reporting when nobody listens
const observe = this.events.hasListeners()
const requestStart = observe ? performance.now() : 0
```

With no listener, `observe` is `false`, `reportRequest` is never called, and
`events.emit(...)` returns immediately. This is why the baseline holds ~148k.

#### 2. Per-request reporting (paid once a listener exists)

Once `observe` is `true`, **every request** is parsed to build the event metadata.
This is the framework cost, and it runs even with an empty listener:

- `performance.now()` is read twice (request start and duration).
- `reportRequest()` builds metadata for `request:complete`, plus `request:error` when status >= 400.
- `requestMetrics()` reads `content-length` (request and response), parses the URL for host and port, and reads `user-agent`.
- One or two event objects are created and dispatched to the listener.

The work your listener itself does is added on top of this, so keep it light on the
hot path.

### Keeping Observability Light

- **Filter first**: only act on faults, skip the high-volume success event.

  ```ts
  // Only react to error events
  router.on((event) => {
    if (event.kind.endsWith(':error')) {
      handleFault(event.kind, event.metadata)
    }
  })
  ```

- **Batch off the request path**: push events into a buffer, flush on a timer to a sink such as a file or an OTel exporter.

Related events you may want to watch: `request:error`, `view:error`,
`reload:error`, `worker:timeout`, `worker:crash`, `session:invalid`,
`csrf:rule-error`, and `process:error`.

## Files

- `benchmark/main.ts`: server entry (non-worker)
- `benchmark/main-worker.ts`: server entry (worker-enabled)
- `benchmark/main-log.ts`: server entry (one empty event listener)
- `benchmark/routes/*.ts`: route handlers
- `benchmark/views/*.dve`: DVE templates
