import { assertEquals } from 'jsr:@std/assert'
import * as Routing from '@routing/index.ts'

const echoWorkerUrl = new URL('../fixtures/echo_worker.ts', import.meta.url).href

Deno.test('Router options propagate to underlying handler (DX config)', () => {
  const router = new Routing.Router({
    routesDir: './routes',
    requestTimeoutMs: 123,
    viewsDir: '/tmp/views',
    worker: { scriptURL: echoWorkerUrl, poolSize: 1 }
  })
  const handler = (router as unknown as { handler: unknown }).handler as {
    requestTimeoutMs?: number
    workerPool?: unknown
    viewEngine?: unknown
  }
  assertEquals(handler.requestTimeoutMs, 123)
  assertEquals(handler.workerPool !== undefined, true)
  assertEquals(handler.viewEngine !== undefined, true)
})

Deno.test('Router#catch does not throw', () => {
  const router = new Routing.Router({ routesDir: './routes' })
  router.catch(async () => null)
})

Deno.test('Router#constructor with options creates instance', () => {
  const router = new Routing.Router({ routesDir: './my-routes' })
  assertEquals(router instanceof Routing.Router, true)
})

Deno.test('Router#constructor with worker option creates instance', () => {
  const router = new Routing.Router({
    routesDir: './routes',
    worker: { scriptURL: echoWorkerUrl, poolSize: 1 }
  })
  assertEquals(router instanceof Routing.Router, true)
})

Deno.test('Router#static does not throw', () => {
  const router = new Routing.Router({ routesDir: './routes' })
  router.static('/assets', { path: './public' })
})

Deno.test('Router#use with middleware only (no path) does not throw', () => {
  const router = new Routing.Router({ routesDir: './routes' })
  router.use(async (_ctx, next) => await next())
})

Deno.test('Router#use with path and middleware does not throw', () => {
  const router = new Routing.Router({ routesDir: './routes' })
  router.use('/api', async (_ctx, next) => await next())
})
