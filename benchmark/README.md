# Performance Benchmarks

## Test Environment

- **Tool:** `autocannon` - [https://www.npmjs.com/package/autocannon](https://www.npmjs.com/package/autocannon)
- **Hardware:** MacBook Pro M3 Pro (11 cores, 18GB RAM)
- **Configuration:** 500 connections, 10 pipelining, 30 seconds


#### Main Application (`main.ts`)
```typescript
import { Router } from '@neabyte/deserve'

// Create a new router
const router = new Router({
  prefix: './routes',    // Directory for route files
  extension: '.ts'       // File extension to load
})

// Serve the router on port 8000
router.serve(8000)
```

#### Route Handler (`routes/test.ts`)
```typescript
import { Send, DeserveRequest } from '@neabyte/deserve'

export function GET(req: DeserveRequest): Response {
  return Send.json({ hello: 'world!' })
}
```

## Test Behavior

### Simple Load Testing
- **Method:** GET only
- **Route:** `/test` endpoint
- **Response:** `{ hello: 'world!' }` JSON
- **File-based routing:** `routes/test.ts`
- **Features:** `DeserveRequest` + `Send.json()` utility

## Benchmark Results

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
