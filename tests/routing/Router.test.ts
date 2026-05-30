import { assertEquals } from '@std/assert'
import * as Routing from '@routing/index.ts'

const echoWorkerUrl = new URL('../fixtures/echo_worker.ts', import.meta.url).href

Deno.test('Router options accepts HandlerOptions fields', () => {
  const router = new Routing.Router({
    routesDir: './routes',
    maxUrlLength: 4096,
    maxRouteParamLength: 512,
    requestTimeoutMs: 5000
  })
  const handler = (router as unknown as { handler: unknown }).handler as {
    maxUrlLength?: number
    maxRouteParamLength?: number
    requestTimeoutMs?: number
  }
  assertEquals(handler.requestTimeoutMs, 5000)
})

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

Deno.test('Router#constructor defaults routesDir to ./routes', () => {
  const router = new Routing.Router()
  const routesDir = (router as unknown as { routesDir: string }).routesDir
  assertEquals(routesDir, './routes')
})

Deno.test('Router#constructor with empty options uses defaults', () => {
  const router = new Routing.Router({})
  assertEquals(router instanceof Routing.Router, true)
})

Deno.test('Router#constructor with only routesDir passes undefined to Handler', () => {
  const router = new Routing.Router({ routesDir: './my-routes' })
  const handler = (router as unknown as { handler: Routing.Handler }).handler
  assertEquals(handler instanceof Routing.Handler, true)
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

Deno.test('Router#constructor without options uses defaults', () => {
  const router = new Routing.Router()
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

Deno.test('Router#use with multiple middleware functions does not throw', () => {
  const router = new Routing.Router({ routesDir: './routes' })
  router.use(
    async (_ctx, next) => await next(),
    async (_ctx, next) => await next()
  )
})

Deno.test('Router#use with path and middleware does not throw', () => {
  const router = new Routing.Router({ routesDir: './routes' })
  router.use('/api', async (_ctx, next) => await next())
})
