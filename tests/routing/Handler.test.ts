import { assertEquals } from '@std/assert'
import { fileURLToPath } from 'node:url'
import * as Routing from '@routing/index.ts'
import * as Core from '@core/index.ts'

const echoWorkerUrl = import.meta.resolve('@tests/fixtures/echo_worker.ts')
const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(/[/\\]$/, '')

Deno.test('Handler addMiddleware runs registered middleware on a request', async () => {
  const handler = new Routing.Handler()
  handler.addMiddleware('', [(ctx) => Promise.resolve(ctx.send.text('from-mw'))])
  const serve = handler.createHandler()
  const res = await serve(new Request('http://localhost/anything'))
  assertEquals(await res.text(), 'from-mw')
})

Deno.test('Handler addMiddleware throws when a handler is not a function', () => {
  const handler = new Routing.Handler()
  let threw = false
  try {
    handler.addMiddleware('', [null as never])
  } catch (e) {
    threw = true
    assertEquals(e instanceof TypeError, true)
  }
  assertEquals(threw, true)
})

Deno.test('Handler addStatic serves a static file', async () => {
  const handler = new Routing.Handler()
  const staticBase = fileURLToPath(import.meta.resolve('@tests/fixtures/static/')).replace(
    /[/\\]$/,
    ''
  )
  handler.addStatic('/assets', { path: staticBase })
  const serve = handler.createHandler()
  const res = await serve(new Request('http://localhost/assets/index.html'))
  assertEquals(res.status, 200)
  assertEquals((await res.text()).includes('static fixture'), true)
})

Deno.test('Handler addStatic throws when options path is empty', () => {
  const handler = new Routing.Handler()
  let threw = false
  try {
    handler.addStatic('/assets', { path: '' })
  } catch (e) {
    threw = true
    assertEquals(e instanceof TypeError, true)
  }
  assertEquals(threw, true)
})

Deno.test('Handler constructor defaults routesDir to ./routes', () => {
  const handler = new Routing.Handler()
  assertEquals(handler.routesDir, './routes')
})

Deno.test('Handler constructor honors a custom routes directory', () => {
  const handler = new Routing.Handler({ routes: { directory: './my-routes' } })
  assertEquals(handler.routesDir, './my-routes')
})

Deno.test('Handler createHandler negotiates a JSON 404', async () => {
  const serve = new Routing.Handler().createHandler()
  const res = await serve(
    new Request('http://localhost/missing', { headers: { accept: 'application/json' } })
  )
  assertEquals(res.status, 404)
  assertEquals(res.headers.get('content-type'), 'application/problem+json')
  await res.body?.cancel()
})

Deno.test('Handler createHandler returns 404 for an unknown route', async () => {
  const serve = new Routing.Handler().createHandler()
  const res = await serve(new Request('http://localhost/missing'))
  assertEquals(res.status, 404)
  await res.body?.cancel()
})

Deno.test('Handler createHandler returns 414 for an over-long URL', async () => {
  const handler = new Routing.Handler({ maxUrlLength: 64 })
  const serve = handler.createHandler()
  const res = await serve(new Request(`http://localhost/${'a'.repeat(200)}`))
  assertEquals(res.status, 414)
  await res.body?.cancel()
})

Deno.test('Handler createHandler returns a request handler function', () => {
  const handler = new Routing.Handler()
  assertEquals(typeof handler.createHandler(), 'function')
})

Deno.test('Handler emitEvent reaches a subscribed listener', () => {
  const handler = new Routing.Handler()
  const kinds: string[] = []
  const unsub = handler.onEvent((event) => kinds.push(event.kind))
  handler.emitEvent(Core.Observability.internalEvent('server:stopped', {}))
  unsub()
  assertEquals(kinds.includes('server:stopped'), true)
})

Deno.test('Handler onEvent returns an unsubscribe function', () => {
  const handler = new Routing.Handler()
  const unsub = handler.onEvent(() => {})
  assertEquals(typeof unsub, 'function')
  unsub()
})

Deno.test('Handler removeRoute is safe when route is absent', () => {
  const handler = new Routing.Handler()
  handler.removeRoute('/none')
  assertEquals(true, true)
})

Deno.test('Handler scanRoutes resolves for a missing directory', async () => {
  const handler = new Routing.Handler({ routes: { directory: './does-not-exist-routes-xyz' } })
  await handler.scanRoutes()
  assertEquals(true, true)
})

Deno.test('Handler setErrorMiddleware is used for error responses', async () => {
  const handler = new Routing.Handler()
  handler.setErrorMiddleware((ctx) => ctx.send.json({ custom: true }, { status: 404 }))
  const serve = handler.createHandler()
  const res = await serve(new Request('http://localhost/missing'))
  assertEquals(res.status, 404)
  assertEquals(await res.json(), { custom: true })
})

Deno.test('Handler terminate disposes a configured worker pool', () => {
  const handler = new Routing.Handler({ worker: { scriptURL: echoWorkerUrl, poolSize: 1 } })
  handler.terminate()
  assertEquals(true, true)
})

Deno.test('Handler terminate is safe without a worker pool', () => {
  const handler = new Routing.Handler()
  handler.terminate()
  assertEquals(true, true)
})

Deno.test('Handler viewEngine is null without views option', () => {
  const handler = new Routing.Handler()
  assertEquals(handler.viewEngine, null)
})

Deno.test('Handler viewEngine is set when views option provided', () => {
  const handler = new Routing.Handler({ views: { directory: viewsDir } })
  assertEquals(handler.viewEngine instanceof Core.Rendering, true)
})
