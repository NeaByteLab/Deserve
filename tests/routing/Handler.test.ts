import { assertEquals } from 'jsr:@std/assert'
import * as Core from '@core/index.ts'
import * as Routing from '@routing/index.ts'

const echoWorkerUrl = new URL('../fixtures/echo_worker.ts', import.meta.url).href

function createTestContext(url: string, requestInit?: RequestInit): Core.Context {
  const request = new Request(url, requestInit)
  return new Core.Context(request, new URL(url), {})
}

Deno.test('Handler addMiddleware path prefix only applies to matching routes', async () => {
  const handler = new Routing.Handler()
  handler.addMiddleware('/api', async (ctx, next) => {
    ctx.setHeader('X-Matched', 'yes')
    return await next()
  })
  handler.addMiddleware('', async ctx => new Response(ctx.responseHeadersMap['X-Matched'] ?? 'no'))
  const handle = handler.createHandler()

  const resApi = await handle(new Request('http://localhost/api/users'))
  assertEquals(await resApi.text(), 'yes')

  const resOther = await handle(new Request('http://localhost/assets'))
  assertEquals(await resOther.text(), 'no')
})

Deno.test('Handler maxRouteParamLength returns 414 when exceeded', async () => {
  const handler = new Routing.Handler({ maxRouteParamLength: 10 })
  ;(
    handler as unknown as { routerInstance: { add: (m: string, p: string, d: unknown) => void } }
  ).routerInstance.add('GET', '/items/:id', {
    handler: (ctx: Core.Context) => new Response(ctx.param('id') ?? '')
  })
  const longId = 'a'.repeat(50)
  const res = await handler.createHandler()(new Request(`http://localhost/items/${longId}`))
  assertEquals(res.status, 414)
})

Deno.test('Handler maxUrlLength returns 414 when exceeded', async () => {
  const handler = new Routing.Handler({ maxUrlLength: 50 })
  const longPath = 'a'.repeat(200)
  const res = await handler.createHandler()(new Request(`http://localhost/${longPath}`))
  assertEquals(res.status, 414)
})

Deno.test('Handler requestTimeoutMs returns 503 when exceeded', async () => {
  const handler = new Routing.Handler({ requestTimeoutMs: 5 })
  handler.addMiddleware('', async () => {
    await new Promise(r => setTimeout(r, 20))
    return new Response('late')
  })
  const res = await handler.createHandler()(new Request('http://localhost/'))
  assertEquals(res.status, 503)
  await res.body?.cancel()
  await new Promise(r => setTimeout(r, 30))
})

Deno.test('Handler viewsDir sets ctx.state.view and can render', async () => {
  const viewsDir = new URL('../fixtures/views/', import.meta.url).pathname.replace(/\/$/, '')
  const handler = new Routing.Handler({ viewsDir })
  handler.addMiddleware('', async ctx => {
    const engine = ctx.state['view'] as { render: (p: string, d?: unknown) => Promise<string> }
    const html = await engine.render('hello.dve', { name: 'DX' } as Record<string, unknown>)
    return new Response(html)
  })
  const res = await handler.createHandler()(new Request('http://localhost/'))
  assertEquals(await res.text(), 'Hello DX.\n')
})

Deno.test('Handler#createHandler with worker option sets ctx.state.worker', async () => {
  const handler = new Routing.Handler({
    worker: { scriptURL: echoWorkerUrl, poolSize: 1 }
  })
  handler.addMiddleware('', async (ctx, next) => {
    if (
      ctx.state['worker'] &&
      typeof (ctx.state['worker'] as { run?: unknown }).run === 'function'
    ) {
      return new Response('ok', { headers: { 'X-Worker': 'set' } })
    }
    return await next()
  })
  const handle = handler.createHandler()
  const res = await handle(new Request('http://localhost/'))
  assertEquals(res.status, 200)
  assertEquals(res.headers.get('X-Worker'), 'set')
  assertEquals(await res.text(), 'ok')
})

Deno.test('Handler#createPattern [id] -> :id', () => {
  const handler = new Routing.Handler()
  assertEquals(handler.createPattern('items/[id].ts'), '/items/:id')
  assertEquals(handler.createPattern('items/[id]/edit.tsx'), '/items/:id/edit')
})

Deno.test('Handler#createPattern index -> /', () => {
  const handler = new Routing.Handler()
  assertEquals(handler.createPattern('index.ts'), '/')
  assertEquals(handler.createPattern('index.tsx'), '/')
  assertEquals(handler.createPattern('Index.TS'), '/')
  assertEquals(handler.createPattern('items/Index.tsx'), '/items')
})

Deno.test('Handler#createPattern invalid extension returns null', () => {
  const handler = new Routing.Handler()
  assertEquals(handler.createPattern('readme.md'), null)
})

Deno.test('Handler#createPattern nested index', () => {
  const handler = new Routing.Handler()
  assertEquals(handler.createPattern('items/index.ts'), '/items')
})

Deno.test('Handler#createPattern skips @ and _ segments', () => {
  const handler = new Routing.Handler()
  assertEquals(handler.createPattern('@components/foo.ts'), null)
  assertEquals(handler.createPattern('_layout.ts'), null)
})

Deno.test('Handler#handleResponse when errorMiddleware returns custom uses it', async () => {
  const handler = new Routing.Handler()
  handler.setErrorMiddleware(async (_ctx, errorInfo) => {
    return new Response(`custom ${errorInfo.statusCode}`, {
      status: errorInfo.statusCode,
      headers: new Headers({ 'X-Custom': 'yes' })
    })
  })
  const ctx = createTestContext('http://localhost/', {
    headers: new Headers({ Accept: 'application/json' })
  })
  const res = await handler.handleResponse(ctx, 404, new Error('gone'))
  assertEquals(res.status, 404)
  assertEquals(res.headers.get('X-Custom'), 'yes')
  assertEquals(await res.text(), 'custom 404')
})

Deno.test('Handler#handleResponse when errorMiddleware returns null uses default', async () => {
  const handler = new Routing.Handler()
  handler.setErrorMiddleware(async () => null)
  const ctx = createTestContext('http://localhost/bar', {
    headers: new Headers({ Accept: 'application/json' })
  })
  const res = await handler.handleResponse(ctx, 404, new Error('Not found'))
  assertEquals(res.status, 404)
  const body = (await res.json()) as { error: string; path: string; statusCode: number }
  assertEquals(body.statusCode, 404)
  assertEquals(body.path, '/bar')
})

Deno.test('Handler#handleResponse with Accept application/json returns JSON', async () => {
  const handler = new Routing.Handler()
  const ctx = createTestContext('http://localhost/foo', {
    headers: new Headers({ Accept: 'application/json' })
  })
  const res = await handler.handleResponse(ctx, 404, new Error('Not found'))
  assertEquals(res.status, 404)
  assertEquals(res.headers.get('Content-Type'), 'application/json')
  const responseBody = (await res.json()) as { error: string; path: string; statusCode: number }
  assertEquals(responseBody.error, 'Not found')
  assertEquals(responseBody.path, '/foo')
  assertEquals(responseBody.statusCode, 404)
})

Deno.test(
  'Handler#handleResponse without JSON Accept returns HTML and escapes message',
  async () => {
    const handler = new Routing.Handler()
    const ctx = createTestContext('http://localhost/')
    const res = await handler.handleResponse(ctx, 500, new Error('Bad <script>'))
    assertEquals(res.status, 500)
    assertEquals(res.headers.get('Content-Type'), 'text/html')
    const html = await res.text()
    assertEquals(html.includes('500'), true)
    assertEquals(html.includes('&lt;script&gt;'), true)
    assertEquals(html.includes('<script>'), false)
  }
)

Deno.test('Handler#validateModule throws when method is not function', () => {
  const handler = new Routing.Handler()
  let thrown = false
  try {
    handler.validateModule({ GET: 'not a function' }, 'routes/foo.ts')
  } catch (e) {
    thrown = true
    assertEquals((e as Error).message.includes('must be a function'), true)
  }
  assertEquals(thrown, true)
})

Deno.test('Handler#validateModule throws when no HTTP method exported', () => {
  const handler = new Routing.Handler()
  let thrown = false
  try {
    handler.validateModule({ default: () => {} }, 'routes/foo.ts')
  } catch (e) {
    thrown = true
    assertEquals((e as Error).message.includes('Must export at least one HTTP method'), true)
  }
  assertEquals(thrown, true)
})
