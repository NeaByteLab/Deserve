# Performance Benchmarks

## Test Environment

- **Tool:** `autocannon` — [npmjs.com/package/autocannon](https://www.npmjs.com/package/autocannon)
- **Configuration:** 500 connections, 10 pipelining, 30 seconds (adjust per run)

## How to Run

**1. Start the server** (from repo root):

```bash
deno task bench
```

Or:

```bash
deno run --allow-net --allow-read benchmark/main.ts
```

**2. Run autocannon** (in another terminal; requires Node/npx):

```bash
npx autocannon http://localhost:8000/test -c 500 -p 10 -d 30
```

## Files

- **`benchmark/main.ts`** — Router with `routesDir: 'benchmark/routes'`, serves on port 8000.
- **`benchmark/routes/test.ts`** — GET handler returning `{ hello: 'world!' }` via `ctx.send.json()`.

## Test Behavior

- **Method:** GET
- **Route:** `/test`
- **Response:** `{ "hello": "world!" }` (JSON)
- **File-based routing:** `benchmark/routes/test.ts` → pattern `/test`
- **API:** `Context` + `ctx.send.json()`

## Previous Benchmark Results

Below: autocannon runs with the older API (MacBook Pro M3 Pro, 11 cores, 18GB RAM). Re-run with the steps above to get numbers for the current codebase.

### Test Run 1

```
Running 30s test @ http://localhost:8000/test
500 connections with 10 pipelining factor


┌─────────┬───────┬───────┬───────┬───────┬──────────┬─────────┬────────┐
│ Stat    │ 2.5%  │ 50%   │ 97.5% │ 99%   │ Avg      │ Stdev   │ Max    │
├─────────┼───────┼───────┼───────┼───────┼──────────┼─────────┼────────┤
│ Latency │ 13 ms │ 24 ms │ 33 ms │ 42 ms │ 24.77 ms │ 5.78 ms │ 138 ms │
└─────────┴───────┴───────┴───────┴───────┴──────────┴─────────┴────────┘
┌───────────┬─────────┬─────────┬─────────┬─────────┬────────────┬───────────┬─────────┐
│ Stat      │ 1%      │ 2.5%    │ 50%     │ 97.5%   │ Avg        │ Stdev     │ Min     │
├───────────┼─────────┼─────────┼─────────┼─────────┼────────────┼───────────┼─────────┤
│ Req/Sec   │ 166,527 │ 166,527 │ 203,519 │ 208,127 │ 199,249.07 │ 10,504.62 │ 166,415 │
├───────────┼─────────┼─────────┼─────────┼─────────┼────────────┼───────────┼─────────┤
│ Bytes/Sec │ 24.8 MB │ 24.8 MB │ 30.3 MB │ 31 MB   │ 29.7 MB    │ 1.56 MB   │ 24.8 MB │
└───────────┴─────────┴─────────┴─────────┴─────────┴────────────┴───────────┴─────────┘

Req/Bytes counts sampled once per second.
# of samples: 30

5983k requests in 30.23s, 891 MB read
```

### Test Run 2

```
Running 30s test @ http://localhost:8000/test
500 connections with 10 pipelining factor


┌─────────┬───────┬───────┬───────┬───────┬──────────┬─────────┬────────┐
│ Stat    │ 2.5%  │ 50%   │ 97.5% │ 99%   │ Avg      │ Stdev   │ Max    │
├─────────┼───────┼───────┼───────┼───────┼──────────┼─────────┼────────┤
│ Latency │ 18 ms │ 23 ms │ 38 ms │ 42 ms │ 24.92 ms │ 6.56 ms │ 158 ms │
└─────────┴───────┴───────┴───────┴───────┴──────────┴─────────┴────────┘
┌───────────┬─────────┬─────────┬─────────┬─────────┬────────────┬───────────┬─────────┐
│ Stat      │ 1%      │ 2.5%    │ 50%     │ 97.5%   │ Avg        │ Stdev     │ Min     │
├───────────┼─────────┼─────────┼─────────┼─────────┼────────────┼───────────┼─────────┤
│ Req/Sec   │ 162,431 │ 162,431 │ 200,063 │ 208,127 │ 197,789.87 │ 10,004.33 │ 162,409 │
├───────────┼─────────┼─────────┼─────────┼─────────┼────────────┼───────────┼─────────┤
│ Bytes/Sec │ 24.2 MB │ 24.2 MB │ 29.8 MB │ 31 MB   │ 29.5 MB    │ 1.49 MB   │ 24.2 MB │
└───────────┴─────────┴─────────┴─────────┴─────────┴────────────┴───────────┴─────────┘

Req/Bytes counts sampled once per second.
# of samples: 30

5939k requests in 30.2s, 884 MB read
```

### Test Run 3

```
Running 30s test @ http://localhost:8000/test
500 connections with 10 pipelining factor


┌─────────┬───────┬───────┬───────┬───────┬──────────┬─────────┬────────┐
│ Stat    │ 2.5%  │ 50%   │ 97.5% │ 99%   │ Avg      │ Stdev   │ Max    │
├─────────┼───────┼───────┼───────┼───────┼──────────┼─────────┼────────┤
│ Latency │ 18 ms │ 23 ms │ 37 ms │ 40 ms │ 24.35 ms │ 5.94 ms │ 160 ms │
└─────────┴───────┴───────┴───────┴───────┴──────────┴─────────┴────────┘
┌───────────┬─────────┬─────────┬─────────┬─────────┬────────────┬──────────┬─────────┐
│ Stat      │ 1%      │ 2.5%    │ 50%     │ 97.5%   │ Avg        │ Stdev    │ Min     │
├───────────┼─────────┼─────────┼─────────┼─────────┼────────────┼──────────┼─────────┤
│ Req/Sec   │ 184,191 │ 184,191 │ 203,391 │ 211,199 │ 202,628.27 │ 5,672.56 │ 184,142 │
├───────────┼─────────┼─────────┼─────────┼─────────┼────────────┼──────────┼─────────┤
│ Bytes/Sec │ 27.4 MB │ 27.4 MB │ 30.3 MB │ 31.5 MB │ 30.2 MB    │ 846 kB   │ 27.4 MB │
└───────────┴─────────┴─────────┴─────────┴─────────┴────────────┴──────────┴─────────┘

Req/Bytes counts sampled once per second.
# of samples: 30

6083k requests in 30.24s, 906 MB read
```
