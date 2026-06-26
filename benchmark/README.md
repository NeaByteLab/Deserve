# Performance Benchmarks

Benchmarks for the Deserve router + DVE view rendering.

## Setup

- **Load tool**: `autocannon` ([npm](https://www.npmjs.com/package/autocannon))
- **Default config used in this doc**: 500 connections, pipelining 10, duration 30s

## Quick Start

Start a server (from repo root), then run `autocannon` from another terminal.

### Start Server

- **Standard mode** (view routes + CPU on main thread):

  ```bash
  deno run --allow-net --allow-read benchmark/main.ts
  ```

- **Listener mode** (one empty event listener attached):

  ```bash
  deno run --allow-net --allow-read benchmark/main-log.ts
  ```

Notes:

- All view routes (`/test-view*`) are available.
- Listener mode is for measuring observability cost, see [Observability Cost](#observability-cost-logging-on-vs-off).

### Run Benchmark

```bash
npx autocannon http://localhost:8000/test -c 500 -p 10 -d 30
```

## Routes

### JSON + CPU Comparison

| Route       | What it does                       | Why it exists            |
| ----------- | ---------------------------------- | ------------------------ |
| `/test`     | JSON only (no CPU work)            | Baseline throughput      |
| `/test-cpu` | 50k `sqrt` loop on **main thread** | Event-loop blocking cost |

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
- **Framework**: Deserve (0.15.0)
- **Engine**: DVE (0.1.1)
- **Runtime**: Deno 2.9.0 (aarch64-apple-darwin)
- **Config**: 500 connections, pipelining 10, duration 30s

## Results - Deno 2.9.0, DVE 0.1.1

`/test` and all view routes are 3 runs each, same machine and config. View
results reflect the include source-text cache (an included partial is read
from disk once and reused, instead of a blocking read per request) together
with the DVE 0.1.1 render pipeline (prepared expressions, pre-split paths,
loop scope reuse, and the sink writer).

### JSON + CPU

| Route   | Test 1  | Test 2  | Test 3  | Req/Sec (avg) | Latency (avg) |
| ------- | ------- | ------- | ------- | ------------- | ------------- |
| `/test` | 199,791 | 198,669 | 198,985 | 199,148       | 24.61 ms      |

Takeaway: JSON baseline throughput on the main thread.

### Views (DVE Rendering Baseline)

| Route                  | Test 1  | Test 2  | Test 3  | Req/Sec (avg) | Latency (avg) |
| ---------------------- | ------- | ------- | ------- | ------------- | ------------- |
| `/test-view`           | 157,039 | 157,350 | 154,167 | 156,186       | 31.51 ms      |
| `/test-view-each-meta` | 28,173  | 28,367  | 28,425  | 28,322        | 175.59 ms     |
| `/test-view-include`   | 133,275 | 131,987 | 133,453 | 132,905       | 37.12 ms      |
| `/test-view-expr`      | 145,139 | 143,403 | 144,670 | 144,404       | 34.12 ms      |

Takeaway: `each` and `include` recovered from the engine extraction. The DVE
0.1.1 render pipeline lifts `each-meta` and expressions well past the earlier
numbers, and `include` runs close to the include-free `/test-view` baseline.

## Observability Cost (Logging On vs Off)

Deserve emits lifecycle events (route, view, request, session, process). By default **no listener is attached**, so the request path skips all reporting and stays cheap. The moment you attach a listener with `router.on(...)`, every request walks the full reporting path. This section measures that difference on the same `/test` route.

### How to Reproduce

Off (no listener) uses `benchmark/main.ts`. On uses `benchmark/main-log.ts` with an empty listener, so the result reflects the framework cost only, not any logging work:

```ts
// benchmark/main-log.ts
import { Router } from '@neabyte/deserve'

const router = new Router({
  routes: { directory: 'benchmark/routes' },
  views: { directory: 'benchmark/views' }
})

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
| Off (no listener)   | 181,158 | 177,024 | 185,173 | 181,118       | 27.12 ms      |
| On (empty listener) | 148,309 | 147,170 | 136,182 | 143,887       | 34.30 ms      |

Attaching a listener drops throughput to about **79%** of the no-listener baseline and raises average latency from 27 ms to 34 ms. This gap is the framework reporting cost, measured with no logging in the listener.

### Where the Cost Comes From

The difference has two parts.

#### 1. The listener gate (cheap when off)

The router only does reporting work when a subscriber exists:

```ts
// Skip reporting when nobody listens
const observe = this.events.hasListeners()
const requestStart = observe ? performance.now() : 0
```

With no listener, `observe` is `false`, `reportRequest` is never called, and `events.emit(...)` returns immediately. This is why the baseline holds ~181k.

#### 2. Per-request reporting (paid once a listener exists)

Once `observe` is `true`, **every request** is parsed to build the event metadata. This is the framework cost, and it runs even with an empty listener:

- `performance.now()` is read twice (request start and duration).
- `reportRequest()` builds metadata for `request:complete`, plus `request:error` when status >= 400.
- `requestMetrics()` reads `content-length` (request and response), parses the URL for host and port, and reads `user-agent`.
- One or two event objects are created and dispatched to the listener.

The work your listener itself does is added on top of this, so keep it light on the hot path.

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

Related events you may want to watch: `request:error`, `view:error`, `reload:error`, `session:invalid`, and `process:error`.

## Files

- `benchmark/main.ts`: server entry
- `benchmark/main-log.ts`: server entry (one empty event listener)
- `benchmark/routes/*.ts`: route handlers
- `benchmark/views/*.dve`: DVE templates
