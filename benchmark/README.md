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

Notes:

- In non-worker mode, **`/test-worker` returns 503** (`worker not enabled`).
- All view routes (`/test-view*`) are available in both modes.

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
```

## Test Environment

- **OS**: macOS 26.5
- **Machine**: Apple M3 Pro, 18 GB RAM
- **Config**: 500 connections, pipelining 10, duration 30s

## Results — Deno 2.8.1 (Latest)

### JSON + CPU (Non-worker)

| Route       | Test 1  | Test 2  | Test 3  | Req/Sec (avg) | Latency (avg) | Total (avg) |
| ----------- | ------- | ------- | ------- | ------------- | ------------- | ----------- |
| `/test`     | 227,499 | 221,359 | 211,746 | 220,201       | 22.23 ms      | 6,611k      |
| `/test-cpu` | 23,155  | 23,429  | 23,206  | 23,263        | 213.77 ms     | 703k        |

### JSON + CPU (Worker-enabled)

| Route          | Test 1  | Test 2  | Test 3  | Req/Sec (avg) | Latency (avg) | Total (avg) |
| -------------- | ------- | ------- | ------- | ------------- | ------------- | ----------- |
| `/test`        | 212,079 | 216,934 | 209,105 | 212,706       | 23.02 ms      | 6,386k      |
| `/test-cpu`    | 23,723  | 23,207  | 23,574  | 23,501        | 211.59 ms     | 710k        |
| `/test-worker` | 75,856  | 84,074  | 88,947  | 82,959        | 60.06 ms      | 2,494k      |

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

Takeaway: `/test-cpu` blocks the event loop; `/test-worker` moves the same work off-thread.

### Views (DVE Rendering Baseline)

| Route                  | Test 1  | Test 2  | Test 3  | Req/Sec (avg) | Latency (avg) | Total (avg) |
| ---------------------- | ------- | ------- | ------- | ------------- | ------------- | ----------- |
| `/test-view`           | 129,063 | 124,978 | 120,516 | 124,852       | 39.77 ms      | 3.75M       |
| `/test-view-each-meta` | 10,406  | 10,381  | 10,073  | 10,287        | 482.13 ms     | 313k        |
| `/test-view-include`   | 112,115 | 109,558 | 101,886 | 107,853       | 46.02 ms      | 3.24M       |
| `/test-view-expr`      | 96,328  | 94,207  | 82,094  | 90,876        | 54.84 ms      | 2.73M       |

## Files

- `benchmark/main.ts`: server entry (non-worker)
- `benchmark/main-worker.ts`: server entry (worker-enabled)
- `benchmark/routes/*.ts`: route handlers
- `benchmark/views/*.dve`: DVE templates
