import { assertEquals } from '@std/assert'
import * as Routing from '@routing/index.ts'

const echoWorkerUrl = import.meta.resolve('@tests/fixtures/echo_worker.ts')

Deno.test('Handler#dispose is safe when no worker pool exists', () => {
  const handler = new Routing.Handler()
  ;(handler as unknown as { dispose(): void }).dispose()
  assertEquals(true, true)
})

Deno.test('Handler#dispose terminates the worker pool and clears it', () => {
  const router = new Routing.Router({
    routesDir: './routes',
    worker: { scriptURL: echoWorkerUrl, poolSize: 1 }
  })
  const handler = (router as unknown as { handler: unknown }).handler as {
    workerPool?: unknown
    dispose(): void
  }
  assertEquals(handler.workerPool !== undefined, true)
  handler.dispose()
  assertEquals(handler.workerPool, undefined)
})

Deno.test('Router options accepts HandlerOptions fields', () => {
  const router = new Routing.Router({
    routesDir: './routes',
    maxUrlLength: 4096,
    maxParamLength: 512,
    requestTimeoutMs: 5000
  })
  const handler = (router as unknown as { handler: unknown }).handler as {
    maxUrlLength?: number
    maxParamLength?: number
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

Deno.test('Router#on receives request:error events from the pipeline', async () => {
  const router = new Routing.Router({ routesDir: './routes' })
  const events: string[] = []
  router.on((event) => events.push(event.kind))
  const handler = (router as unknown as { handler: Routing.Handler }).handler
  const serve = handler.createHandler()
  const res = await serve(new Request('http://localhost/missing-route'))
  await res.body?.cancel()
  assertEquals(res.status, 404)
  assertEquals(events.includes('request:error'), true)
})

Deno.test('Router#on returns an unsubscribe function', () => {
  const router = new Routing.Router({ routesDir: './routes' })
  const unsub = router.on(() => {})
  assertEquals(typeof unsub, 'function')
  unsub()
})

Deno.test('Router#on unsubscribe stops receiving events', async () => {
  const router = new Routing.Router({ routesDir: './routes' })
  let count = 0
  const unsub = router.on(() => count++)
  const handler = (router as unknown as { handler: Routing.Handler }).handler
  const serve = handler.createHandler()
  await serve(new Request('http://localhost/missing-one')).then((r) => r.body?.cancel())
  const afterFirst = count
  unsub()
  await serve(new Request('http://localhost/missing-two')).then((r) => r.body?.cancel())
  assertEquals(afterFirst > 0, true)
  assertEquals(count, afterFirst)
})

Deno.test('Router#serve drains an in-flight request and emits server:shutdown', async () => {
  const router = new Routing.Router({ routesDir: './does-not-exist-routes-dir-xyz' })
  let drained = false
  const handlerStarted = Promise.withResolvers<void>()
  router.use(async (ctx) => {
    handlerStarted.resolve()
    await new Promise((resolve) => setTimeout(resolve, 150))
    drained = true
    return ctx.send.text('done')
  })
  let shutdownEmitted = false
  const listening = Promise.withResolvers<number>()
  router.on((event) => {
    if (event.kind === 'server:listening') {
      listening.resolve(event.metadata.port)
    }
    if (event.kind === 'server:shutdown') {
      shutdownEmitted = true
    }
  })
  const controller = new AbortController()
  const serving = router.serve(0, '127.0.0.1', controller.signal)
  const port = await listening.promise
  const inFlight = fetch(`http://127.0.0.1:${port}/drain-test`, {
    signal: AbortSignal.timeout(5000)
  })
  await handlerStarted.promise
  controller.abort()
  const response = await inFlight
  assertEquals(response.status, 200)
  assertEquals(await response.text(), 'done')
  assertEquals(drained, true)
  await serving
  assertEquals(shutdownEmitted, true)
})

Deno.test('Router#shutdownSignals includes SIGTERM on POSIX and only SIGINT on Windows', () => {
  const signals = (Routing.Router as unknown as {
    shutdownSignals(): readonly string[]
  }).shutdownSignals()
  assertEquals(signals.includes('SIGINT'), true)
  if (Deno.build.os === 'windows') {
    assertEquals(signals.includes('SIGTERM'), false)
  } else {
    assertEquals(signals.includes('SIGTERM'), true)
  }
})

Deno.test('Router#static does not throw', () => {
  const router = new Routing.Router({ routesDir: './routes' })
  router.static('/assets', { path: './public' })
})

Deno.test('Router#static throws when path option is missing or not a string', () => {
  const router = new Routing.Router({ routesDir: './routes' })
  for (const bad of [{}, { path: 123 }, { path: '' }]) {
    let threw = false
    try {
      router.static('/assets', bad as unknown as { path: string })
    } catch (e) {
      threw = true
      assertEquals(e instanceof TypeError, true)
    }
    assertEquals(threw, true)
  }
})

Deno.test('Router#use throws when called with a path string and no middleware', () => {
  const router = new Routing.Router({ routesDir: './routes' })
  let threw = false
  try {
    router.use('/api' as unknown as () => Response)
  } catch (e) {
    threw = true
    assertEquals(e instanceof TypeError, true)
  }
  assertEquals(threw, true)
})

Deno.test('Router#use throws when middleware is not a function', () => {
  const router = new Routing.Router({ routesDir: './routes' })
  let threw = false
  try {
    router.use(null as unknown as () => Response)
  } catch (e) {
    threw = true
    assertEquals(e instanceof TypeError, true)
  }
  assertEquals(threw, true)
})

Deno.test('Router#use throws when path-scoped middleware is not a function', () => {
  const router = new Routing.Router({ routesDir: './routes' })
  let threw = false
  try {
    router.use('/api', undefined as unknown as () => Response)
  } catch (e) {
    threw = true
    assertEquals(e instanceof TypeError, true)
  }
  assertEquals(threw, true)
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

Deno.test('Watcher#watch returns a callable stop handle for a missing directory', () => {
  const handler = new Routing.Handler()
  const stop = Routing.Watcher.watch(handler, './does-not-exist-routes-dir-xyz')
  assertEquals(typeof stop, 'function')
  stop()
})

Deno.test('Watcher#watch skips a non-existent routes directory without throwing', () => {
  const handler = new Routing.Handler()
  Routing.Watcher.watch(handler, './does-not-exist-routes-dir-xyz')
  assertEquals(true, true)
})
