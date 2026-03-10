# Performance Benchmarks

## Test Environment

- **Tool:** `autocannon` — [npmjs.com/package/autocannon](https://www.npmjs.com/package/autocannon)
- **Configuration:** 500 connections, 10 pipelining, 30 seconds (adjust per run)

## How to Run

**1. Start the server** (from repo root). Pick one:

- **Without worker** — `/test` and `/test-cpu` only; `/test-worker` returns 503:

  ```bash
  deno run --allow-net --allow-read benchmark/main.ts
  ```

- **With worker** — all routes including `/test-worker`:
  ```bash
  deno run --allow-net --allow-read benchmark/main-worker.ts
  ```

**2. Run autocannon** (in another terminal; requires Node/npx):

```bash
npx autocannon http://localhost:8000/test -c 500 -p 10 -d 30
```

## Files

- **`benchmark/main.ts`** — Router without worker. Serves `/test`, `/test-cpu`.
- **`benchmark/main-worker.ts`** — Router with worker pool (inline CPU loop).
- **`benchmark/routes/test.ts`** — GET `/test`: baseline, JSON only (no CPU work).
- **`benchmark/routes/test-cpu.ts`** — GET `/test-cpu`: same CPU work (50k sqrt loop) on **main thread**.
- **`benchmark/routes/test-worker.ts`** — GET `/test-worker`: same CPU work offloaded to **worker**.

## Routes for comparison

| Route          | Description                  | Use case             |
| -------------- | ---------------------------- | -------------------- |
| `/test`        | JSON only, no CPU            | Baseline throughput  |
| `/test-cpu`    | 50k sqrt loop on main thread | Main-thread CPU cost |
| `/test-worker` | Same loop in worker pool     | Worker offload cost  |

Run autocannon against each route (in another terminal):

```bash
# Baseline (no CPU)
npx autocannon http://localhost:8000/test -c 500 -p 10 -d 30

# CPU on main thread (blocks event loop)
npx autocannon http://localhost:8000/test-cpu -c 500 -p 10 -d 30

# CPU in worker (non-blocking)
npx autocannon http://localhost:8000/test-worker -c 500 -p 10 -d 30
```

## Latest benchmark results (30s, 500 conn, pipelining 10)

**Non-worker** — `main.ts`:

| Route          | Test 1  | Test 2  | Test 3  | Req/Sec (avg) | Latency (avg) | Total (avg) |
| -------------- | ------- | ------- | ------- | ------------- | ------------- | ----------- |
| `/test`        | 175,343 | 170,567 | 164,515 | 170,142       | 29 ms         | 5109k       |
| `/test-cpu`    | 25,009  | 24,949  | 24,927  | 24,962        | 199 ms        | 754k        |
| `/test-worker` | 150,151 | 148,683 | 148,061 | 148,965       | 33 ms         | 4474k       |

`/test-worker` without worker returns 503 (no pool).

**With worker** — `main-worker.ts` (worker pool, poolSize 4).

| Route          | Test 1  | Test 2  | Test 3  | Req/Sec (avg) | Latency (avg) | Total (avg) |
| -------------- | ------- | ------- | ------- | ------------- | ------------- | ----------- |
| `/test`        | 174,259 | 178,487 | 170,834 | 174,527       | 28 ms         | 5.24M       |
| `/test-cpu`    | 25,133  | 24,833  | 24,773  | 24,912        | 199 ms        | 752k        |
| `/test-worker` | 69,265  | 69,063  | 68,810  | 69,046        | 72 ms         | 2076k       |

**Conclusion (test-cpu vs test-worker).** Both routes run the same CPU-bound workload (50k sqrt loop). `/test-cpu` runs it on the main thread and blocks the event loop (~25k req/s, ~199 ms). `/test-worker` offloads the work to a worker pool (~69k req/s, ~72 ms). For CPU-bound tasks, using the worker yields roughly 2.8× higher throughput and ~2.8× lower latency because the main thread stays free to accept and dispatch requests.

## Test Behavior (baseline)

- **Method:** GET
- **Route:** `/test`
- **Response:** `{ "hello": "world!" }` (JSON)
- **File-based routing:** `benchmark/routes/test.ts` → pattern `/test`
- **API:** `Context` + `ctx.send.json()`
