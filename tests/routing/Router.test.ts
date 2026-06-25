import { assertEquals } from '@std/assert'
import * as Routing from '@routing/index.ts'
import * as Middleware from '@middleware/index.ts'

const echoWorkerUrl = import.meta.resolve('@tests/fixtures/echo_worker.ts')

function freePort(): number {
  const listener = Deno.listen({ port: 0, hostname: '127.0.0.1' })
  const port = (listener.addr as Deno.NetAddr).port
  listener.close()
  return port
}

Deno.test('Router applies default headers on an error response', async () => {
  const router = new Routing.Router()
  router.use(Middleware.Mware.securityHeaders())
  router.use(() => {
    throw new Error('handler boom')
  })
  const listening = Promise.withResolvers<void>()
  router.on((event) => {
    if (event.kind === 'server:started') {
      listening.resolve()
    }
  })
  const port = freePort()
  const controller = new AbortController()
  const serving = router.serve(port, '127.0.0.1', controller.signal)
  await listening.promise
  const response = await fetch(`http://127.0.0.1:${port}/boom`, {
    signal: AbortSignal.timeout(5000)
  })
  await response.body?.cancel()
  assertEquals(response.status, 500)
  assertEquals(response.headers.get('x-content-type-options'), 'nosniff')
  assertEquals(response.headers.get('x-frame-options'), 'SAMEORIGIN')
  controller.abort()
  await serving
})

Deno.test('Router catch registers an error handler without throwing', () => {
  const router = new Routing.Router()
  router.catch(() => Promise.resolve(null))
})

Deno.test('Router constructor with a worker option creates an instance', () => {
  const router = new Routing.Router({ worker: { scriptURL: echoWorkerUrl, poolSize: 1 } })
  assertEquals(router instanceof Routing.Router, true)
})

Deno.test('Router constructor with empty options creates an instance', () => {
  assertEquals(new Routing.Router({}) instanceof Routing.Router, true)
})

Deno.test('Router constructor without options creates an instance', () => {
  assertEquals(new Routing.Router() instanceof Routing.Router, true)
})

Deno.test('Router instance is frozen', () => {
  const router = new Routing.Router()
  assertEquals(Object.isFrozen(router), true)
})

Deno.test('Router on receives request:failed events from the pipeline', async () => {
  const router = new Routing.Router()
  const events: string[] = []
  router.on((event) => events.push(event.kind))
  const listening = Promise.withResolvers<void>()
  router.on((event) => {
    if (event.kind === 'server:started') {
      listening.resolve()
    }
  })
  const port = freePort()
  const controller = new AbortController()
  const serving = router.serve(port, '127.0.0.1', controller.signal)
  await listening.promise
  const res = await fetch(`http://127.0.0.1:${port}/missing`, { signal: AbortSignal.timeout(5000) })
  await res.body?.cancel()
  assertEquals(res.status, 404)
  controller.abort()
  await serving
  assertEquals(events.includes('request:failed'), true)
})

Deno.test('Router on returns an unsubscribe function', () => {
  const router = new Routing.Router()
  const unsub = router.on(() => {})
  assertEquals(typeof unsub, 'function')
  unsub()
})

Deno.test('Router serve drains an in-flight request before shutdown', async () => {
  const router = new Routing.Router()
  let drained = false
  const handlerStarted = Promise.withResolvers<void>()
  router.use(async (ctx) => {
    handlerStarted.resolve()
    await new Promise((resolve) => setTimeout(resolve, 150))
    drained = true
    return ctx.send.text('done')
  })
  const listening = Promise.withResolvers<void>()
  router.on((event) => {
    if (event.kind === 'server:started') {
      listening.resolve()
    }
  })
  const port = freePort()
  const controller = new AbortController()
  const serving = router.serve(port, '127.0.0.1', controller.signal)
  await listening.promise
  const inFlight = fetch(`http://127.0.0.1:${port}/drain`, { signal: AbortSignal.timeout(5000) })
  await handlerStarted.promise
  controller.abort()
  const response = await inFlight
  assertEquals(response.status, 200)
  assertEquals(await response.text(), 'done')
  assertEquals(drained, true)
  await serving
})

Deno.test('Router serve emits server:started and server:stopped', async () => {
  const router = new Routing.Router()
  let shutdownEmitted = false
  const listening = Promise.withResolvers<void>()
  router.on((event) => {
    if (event.kind === 'server:started') {
      listening.resolve()
    }
    if (event.kind === 'server:stopped') {
      shutdownEmitted = true
    }
  })
  const port = freePort()
  const controller = new AbortController()
  const serving = router.serve(port, '127.0.0.1', controller.signal)
  await listening.promise
  controller.abort()
  await serving
  assertEquals(shutdownEmitted, true)
})

Deno.test('Router static mounts without throwing', () => {
  const router = new Routing.Router()
  router.static('/assets', { path: './public' })
})

Deno.test('Router static throws when the path option is invalid', () => {
  const router = new Routing.Router()
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

Deno.test('Router use throws when a path is given without middleware', () => {
  const router = new Routing.Router()
  let threw = false
  try {
    router.use('/api')
  } catch (e) {
    threw = true
    assertEquals(e instanceof TypeError, true)
  }
  assertEquals(threw, true)
})

Deno.test('Router use with a middleware function does not throw', () => {
  const router = new Routing.Router()
  router.use(async (_ctx, next) => await next())
})

Deno.test('Router use with a path and middleware does not throw', () => {
  const router = new Routing.Router()
  router.use('/api', async (_ctx, next) => await next())
})
