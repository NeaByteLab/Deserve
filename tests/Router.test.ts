import { assertEquals } from 'jsr:@std/assert'
import { Router } from '@app/index.ts'

const echoWorkerUrl = new URL('fixtures/echo_worker.ts', import.meta.url).href

Deno.test('Router#catch does not throw', () => {
  const router = new Router({ routesDir: './routes' })
  router.catch(async () => null)
})

Deno.test('Router#constructor with options creates instance', () => {
  const router = new Router({ routesDir: './my-routes' })
  assertEquals(router instanceof Router, true)
})

Deno.test('Router#constructor with worker option creates instance', () => {
  const router = new Router({
    routesDir: './routes',
    worker: { scriptURL: echoWorkerUrl, poolSize: 1 }
  })
  assertEquals(router instanceof Router, true)
})

Deno.test('Router#static does not throw', () => {
  const router = new Router({ routesDir: './routes' })
  router.static('/assets', { path: './public' })
})

Deno.test('Router#use with middleware only (no path) does not throw', () => {
  const router = new Router({ routesDir: './routes' })
  router.use(async (_ctx, next) => await next())
})

Deno.test('Router#use with path and middleware does not throw', () => {
  const router = new Router({ routesDir: './routes' })
  router.use('/api', async (_ctx, next) => await next())
})
