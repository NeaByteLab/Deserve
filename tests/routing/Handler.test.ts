import type * as Types from '@interfaces/index.ts'
import { assertEquals } from '@std/assert'
import { fileURLToPath } from 'node:url'
import { Handler } from '@core/Handler.ts'
import * as Core from '@core/index.ts'
import * as Routing from '@routing/index.ts'

const echoWorkerUrl = import.meta.resolve('@tests/fixtures/echo_worker.ts')

function createTestContext(url: string, requestInit?: RequestInit): Core.Context {
  const request = new Request(url, requestInit)
  return new Core.Context(request, new URL(url), {})
}

Deno.test('Handler 404 for unmatched route returns HTML without Accept json', async () => {
  const handler = new Routing.Handler()
  const res = await handler.createHandler()(new Request('http://localhost/unknown'))
  assertEquals(res.status, 404)
  assertEquals(res.headers.get('Content-Type'), 'text/html; charset=utf-8')
  const html = await res.text()
  assertEquals(html.includes('404'), true)
})

Deno.test('Handler 404 for unmatched route returns JSON when Accept json', async () => {
  const handler = new Routing.Handler()
  const res = await handler.createHandler()(
    new Request('http://localhost/unknown', {
      headers: new Headers({ Accept: 'application/json' })
    })
  )
  assertEquals(res.status, 404)
  assertEquals(res.headers.get('Content-Type'), 'application/json')
  const body = (await res.json()) as { error: string }
  assertEquals(body.error, 'Not Found')
})

Deno.test('Handler 405 Allow advertises HEAD for a GET-only route (RFC 7231 §4.3.2)', async () => {
  const handler = new Routing.Handler()
  const routerInstance = (
    handler as unknown as { routerInstance: { add: (m: string, p: string, d: unknown) => void } }
  ).routerInstance
  routerInstance.add('GET', '/only-get', {
    handler: () => new Response('ok'),
    pattern: '/only-get'
  })
  const serve = handler.createHandler()
  for (const method of ['POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']) {
    const res = await serve(new Request('http://localhost/only-get', { method }))
    assertEquals(res.status, 405)
    assertEquals(res.headers.get('Allow'), 'GET, HEAD')
    await res.body?.cancel()
  }
})

Deno.test('Handler 405 response lists valid methods in the Allow header', async () => {
  const handler = new Routing.Handler()
  const routerInstance = (
    handler as unknown as { routerInstance: { add: (m: string, p: string, d: unknown) => void } }
  ).routerInstance
  routerInstance.add('GET', '/items', {
    handler: () => new Response('ok'),
    pattern: '/items'
  })
  routerInstance.add('POST', '/items', {
    handler: () => new Response('created'),
    pattern: '/items'
  })
  const res = await handler.createHandler()(
    new Request('http://localhost/items', { method: 'DELETE' })
  )
  assertEquals(res.status, 405)
  assertEquals(res.headers.get('Allow'), 'GET, HEAD, POST')
  await res.body?.cancel()
})

Deno.test('Handler 414 HTML response includes charset', async () => {
  const handler = new Routing.Handler({ maxUrlLength: 30 })
  const serve = handler.createHandler()
  const longUrl = 'http://localhost/' + 'x'.repeat(50)
  const res = await serve(new Request(longUrl))
  assertEquals(res.status, 414)
  assertEquals(res.headers.get('Content-Type'), 'text/html; charset=utf-8')
})

Deno.test('Handler HEAD omits Content-Length rather than buffering an unset-length body', async () => {
  const handler = new Routing.Handler()
  const routeModule = {
    GET: (ctx: Core.Context) => ctx.send.json({ hello: 'world' })
  }
  Routing.Scanner.registerHandlers(
    (handler as unknown as { routerInstance: { add: (m: string, p: string, d: unknown) => void } })
      .routerInstance as Parameters<typeof Routing.Scanner.registerHandlers>[0],
    routeModule,
    '/cl',
    ['GET']
  )
  const serve = handler.createHandler()
  const headRes = await serve(new Request('http://localhost/cl', { method: 'HEAD' }))
  assertEquals(headRes.headers.get('Content-Length'), null)
  assertEquals(headRes.body, null)
  assertEquals(headRes.status, 200)
})

Deno.test('Handler HEAD preserves a Content-Length the handler set explicitly', async () => {
  const handler = new Routing.Handler()
  const routeModule = {
    GET: () => new Response('hello', { headers: { 'Content-Length': '5' } })
  }
  Routing.Scanner.registerHandlers(
    (handler as unknown as { routerInstance: { add: (m: string, p: string, d: unknown) => void } })
      .routerInstance as Parameters<typeof Routing.Scanner.registerHandlers>[0],
    routeModule,
    '/cl-explicit',
    ['GET']
  )
  const serve = handler.createHandler()
  const headRes = await serve(new Request('http://localhost/cl-explicit', { method: 'HEAD' }))
  assertEquals(headRes.headers.get('Content-Length'), '5')
  assertEquals(headRes.body, null)
  assertEquals(headRes.status, 200)
})

Deno.test('Handler HEAD request returns null body', async () => {
  const handler = new Routing.Handler()
  const routeModule = {
    GET: (ctx: Core.Context) => ctx.send.text('hello world')
  }
  Routing.Scanner.registerHandlers(
    (handler as unknown as { routerInstance: { add: (m: string, p: string, d: unknown) => void } })
      .routerInstance as Parameters<typeof Routing.Scanner.registerHandlers>[0],
    routeModule,
    '/test',
    ['GET']
  )
  const serve = handler.createHandler()
  const res = await serve(new Request('http://localhost/test', { method: 'HEAD' }))
  assertEquals(res.body, null)
  assertEquals(res.status, 200)
})

Deno.test('Handler a throwing trustProxy predicate is funneled to a masked 500 with security headers', async () => {
  const handler = new Routing.Handler({
    trustProxy: (ip) => {
      if (ip === '10.0.0.9') {
        throw new Error('trustProxy boom')
      }
      return true
    }
  })
  handler.addMiddleware('', () => new Response('ok'))
  const handle = handler.createHandler()
  const info = {
    remoteAddr: { transport: 'tcp', hostname: '10.0.0.9', port: 1 }
  } as Deno.ServeHandlerInfo
  const res = await handle(new Request('http://localhost/'), info)
  assertEquals(res.status, 500)
  assertEquals(res.headers.get('X-Content-Type-Options'), 'nosniff')
})

Deno.test('Handler a trustProxy that throws on an attacker XFF hop does not escape', async () => {
  const handler = new Routing.Handler({
    trustProxy: (ip) => {
      if (ip === '1.2.3.4') {
        throw new Error('hop boom')
      }
      return true
    }
  })
  handler.addMiddleware('', () => new Response('ok'))
  const handle = handler.createHandler()
  const info = {
    remoteAddr: { transport: 'tcp', hostname: '127.0.0.1', port: 1 }
  } as Deno.ServeHandlerInfo
  const res = await handle(
    new Request('http://localhost/', { headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } }),
    info
  )
  assertEquals(res.status, 500)
  assertEquals(res.headers.get('X-Content-Type-Options'), 'nosniff')
})

Deno.test('Handler addMiddleware path prefix only applies to matching routes', async () => {
  const handler = new Routing.Handler()
  handler.addMiddleware('/api', async (ctx, next) => {
    ctx.setHeader('X-Matched', 'yes')
    return await next()
  })
  handler.addMiddleware(
    '',
    async (ctx) => new Response(ctx[Core.InternalContext].responseHeadersMap['X-Matched'] ?? 'no')
  )
  const handle = handler.createHandler()

  const resApi = await handle(new Request('http://localhost/api/users'))
  assertEquals(await resApi.text(), 'yes')

  const resOther = await handle(new Request('http://localhost/assets'))
  assertEquals(await resOther.text(), 'no')
})

Deno.test('Handler applies middleware-set headers and cookies to a raw Response return', async () => {
  const handler = new Routing.Handler()
  handler.addMiddleware('', (ctx: Core.Context, next) => {
    ctx.setHeader('X-Sec', 'on')
    ctx.setHeader('Set-Cookie', 'sid=abc; Path=/')
    return next()
  })
  ;(
    handler as unknown as { routerInstance: { add: (m: string, p: string, d: unknown) => void } }
  ).routerInstance.add('GET', '/raw', {
    handler: () => new Response('raw', { headers: { 'Content-Type': 'text/plain' } })
  })
  const res = await handler.createHandler()(new Request('http://localhost/raw'))
  assertEquals(res.status, 200)
  assertEquals(res.headers.get('X-Sec'), 'on')
  assertEquals(res.headers.get('Set-Cookie'), 'sid=abc; Path=/')
  assertEquals(res.headers.get('Content-Type'), 'text/plain')
  assertEquals(await res.text(), 'raw')
})

Deno.test('Handler constructor accepts omitted and valid numeric options', () => {
  new Routing.Handler({})
  new Routing.Handler({ requestTimeoutMs: 5000, maxParamLength: 100, maxUrlLength: 2048 })
})

Deno.test('Handler constructor throws InvalidData on non-positive maxParamLength/maxUrlLength', () => {
  let a = false
  try {
    new Routing.Handler({ maxParamLength: -1 })
  } catch (e) {
    a = true
    assertEquals(e instanceof Deno.errors.InvalidData, true)
  }
  assertEquals(a, true)
  let b = false
  try {
    new Routing.Handler({ maxUrlLength: 0 })
  } catch (e) {
    b = true
    assertEquals(e instanceof Deno.errors.InvalidData, true)
  }
  assertEquals(b, true)
})

Deno.test('Handler constructor throws InvalidData on non-positive requestTimeoutMs', () => {
  for (const bad of [-5, 0, NaN, Infinity]) {
    let thrown = false
    try {
      new Routing.Handler({ requestTimeoutMs: bad })
    } catch (e) {
      thrown = true
      assertEquals(e instanceof Deno.errors.InvalidData, true)
    }
    assertEquals(thrown, true)
  }
})

Deno.test('Handler constructor with no options uses defaults', async () => {
  const handler = new Routing.Handler()
  const handle = handler.createHandler()
  const res = await handle(new Request('http://localhost/'))
  assertEquals(res.status, 404)
  await res.body?.cancel()
})

Deno.test('Handler continues to the next middleware when a middleware returns undefined', async () => {
  const handler = new Routing.Handler()
  handler.addMiddleware('', () => undefined)
  handler.addMiddleware('', () => new Response('reached', { status: 201 }))
  const res = await handler.createHandler()(new Request('http://localhost/'))
  assertEquals(res.status, 201)
  assertEquals(await res.text(), 'reached')
})

Deno.test('Handler createPattern with .cjs extension', () => {
  const handler = new Routing.Handler()
  assertEquals(handler.createPattern('items/create.cjs'), '/items/create')
})

Deno.test('Handler createPattern with .jsx extension', () => {
  const handler = new Routing.Handler()
  assertEquals(handler.createPattern('items/create.jsx'), '/items/create')
})

Deno.test('Handler createPattern with .mjs extension', () => {
  const handler = new Routing.Handler()
  assertEquals(handler.createPattern('items/create.mjs'), '/items/create')
})

Deno.test('Handler does not double-apply cookies to a ctx.send response', async () => {
  const handler = new Routing.Handler()
  handler.addMiddleware('', (ctx: Core.Context, next) => {
    ctx.setHeader('Set-Cookie', 'sid=abc; Path=/')
    return next()
  })
  ;(
    handler as unknown as { routerInstance: { add: (m: string, p: string, d: unknown) => void } }
  ).routerInstance.add('GET', '/sendc', {
    handler: (ctx: Core.Context) => ctx.send.json({ ok: true })
  })
  const res = await handler.createHandler()(new Request('http://localhost/sendc'))
  assertEquals(res.status, 200)
  assertEquals(res.headers.getSetCookie().length, 1)
  await res.body?.cancel()
})

Deno.test('Handler emits a request:complete event for every served request including errors', async () => {
  const handler = new Routing.Handler()
  const routerInstance = (
    handler as unknown as { routerInstance: { add: (m: string, p: string, d: unknown) => void } }
  ).routerInstance
  routerInstance.add('GET', '/fail', {
    handler: () => {
      throw new Error('internal boom')
    },
    pattern: '/fail'
  })
  const kinds: string[] = []
  handler.onEvent((event) => kinds.push(event.kind))
  const res = await handler.createHandler()(new Request('http://localhost/fail'))
  assertEquals(res.status, 500)
  await res.body?.cancel()
  assertEquals(kinds.includes('request:complete'), true)
  assertEquals(kinds.includes('request:error'), true)
})

Deno.test('Handler emits external request:error for a developer-built 4xx response', async () => {
  const handler = new Routing.Handler()
  const events: Types.EventBase[] = []
  handler.onEvent((event) => events.push(event))
  handler.addMiddleware('', () => new Response('nope', { status: 404 }))
  const res = await handler.createHandler()(new Request('http://localhost/'))
  assertEquals(res.status, 404)
  await res.body?.cancel()
  const errorEvent = events.find((e) => e.kind === 'request:error')
  assertEquals(errorEvent?.kind === 'request:error' && errorEvent.metadata.statusCode, 404)
  assertEquals(errorEvent?.type, 'external')
  assertEquals(errorEvent?.kind === 'request:error' && errorEvent.metadata.error, undefined)
  const complete = events.find((e) => e.kind === 'request:complete')
  assertEquals(complete?.type, 'external')
})

Deno.test('Handler emits full request metadata when a listener is registered', async () => {
  const handler = new Routing.Handler()
  const events: Types.EventBase[] = []
  const unsub = handler.onEvent((event) => events.push(event))
  const response = await handler.createHandler()(
    new Request('http://localhost/unknown', { headers: { 'user-agent': 'probe/1.0' } })
  )
  unsub()
  assertEquals(response.status, 404)
  const complete = events.find((event) => event.kind === 'request:complete')
  assertEquals(complete !== undefined, true)
  const metadata = complete?.metadata as {
    method: string
    statusCode: number
    url: string
    durationMs: number
    userAgent?: string
    serverAddress?: string
  }
  assertEquals(metadata.method, 'GET')
  assertEquals(metadata.statusCode, 404)
  assertEquals(metadata.userAgent, 'probe/1.0')
  assertEquals(metadata.serverAddress, 'localhost')
})

Deno.test('Handler emits internal request:error with Error for an unmatched route', async () => {
  const handler = new Routing.Handler()
  const events: Types.EventBase[] = []
  handler.onEvent((event) => events.push(event))
  const res = await handler.createHandler()(new Request('http://localhost/no-such-route'))
  assertEquals(res.status, 404)
  await res.body?.cancel()
  const errorEvents = events.filter((e) => e.kind === 'request:error')
  assertEquals(errorEvents.length, 1)
  const onlyError = errorEvents[0]
  assertEquals(onlyError?.type, 'internal')
  assertEquals(
    onlyError?.kind === 'request:error' && onlyError.metadata.error !== undefined,
    true
  )
  assertEquals(events.some((e) => e.kind === 'request:complete'), true)
})

Deno.test('Handler emits no observability event when no listener is registered', async () => {
  const handler = new Routing.Handler()
  const response = await handler.createHandler()(new Request('http://localhost/unknown'))
  assertEquals(response.status, 404)
})

Deno.test('Handler emits request:complete for a successful developer response', async () => {
  const handler = new Routing.Handler()
  const events: Types.EventBase[] = []
  handler.onEvent((event) => events.push(event))
  handler.addMiddleware('', () => new Response('ok', { status: 200 }))
  const res = await handler.createHandler()(new Request('http://localhost/'))
  assertEquals(res.status, 200)
  await res.body?.cancel()
  const complete = events.find((e) => e.kind === 'request:complete')
  assertEquals(complete?.kind === 'request:complete' && complete.metadata.statusCode, 200)
  assertEquals(complete?.type, 'external')
  assertEquals(
    complete?.kind === 'request:complete' && typeof complete.metadata.durationMs,
    'number'
  )
  assertEquals(events.some((e) => e.kind === 'request:error'), false)
})

Deno.test('Handler fake Response on a HEAD request does not escape the error funnel', async () => {
  const handler = new Routing.Handler()
  handler.addMiddleware('', () => Object.create(Response.prototype) as Response)
  const handle = handler.createHandler()
  const res = await handle(new Request('http://localhost/', { method: 'HEAD' }))
  assertEquals(res.status, 500)
})

Deno.test('Handler handleResponse catches builder exception', async () => {
  const handler = new Routing.Handler({
    errorResponseBuilder: {
      build: () => {
        throw new Error('builder exploded')
      }
    }
  })
  const routeModule = {
    GET: () => {
      throw new Error('route error')
    }
  }
  Routing.Scanner.registerHandlers(
    (handler as unknown as { routerInstance: { add: (m: string, p: string, d: unknown) => void } })
      .routerInstance as Parameters<typeof Routing.Scanner.registerHandlers>[0],
    routeModule,
    '/fail',
    ['GET']
  )
  const serve = handler.createHandler()
  const res = await serve(new Request('http://localhost/fail'))
  assertEquals(res.status, 500)
})

Deno.test('Handler masks a non-Response return as JSON Internal Server Error', async () => {
  const handler = new Routing.Handler()
  handler.addMiddleware('', () => ({ foo: 'bar' }) as unknown as Response)
  const req = new Request('http://localhost/', {
    headers: new Headers({ Accept: 'application/json' })
  })
  const res = await handler.createHandler()(req)
  assertEquals(res.status, 500)
  assertEquals(res.headers.get('Content-Type'), 'application/json')
  const body = (await res.json()) as { error: string }
  assertEquals(body.error, 'Internal Server Error')
})

Deno.test('Handler maxRouteParamLength returns 414 when exceeded', async () => {
  const handler = new Routing.Handler({ maxParamLength: 10 })
  ;(
    handler as unknown as { routerInstance: { add: (m: string, p: string, d: unknown) => void } }
  ).routerInstance.add('GET', '/items/:id', {
    handler: (ctx: Core.Context) => new Response(ctx.param('id') ?? '')
  })
  const longId = 'a'.repeat(50)
  const res = await handler.createHandler()(new Request(`http://localhost/items/${longId}`))
  assertEquals(res.status, 414)
})

Deno.test('Handler maxRouteParamLength with Infinity throws InvalidData', () => {
  let thrown = false
  try {
    new Routing.Handler({ maxParamLength: Infinity })
  } catch (e) {
    thrown = true
    assertEquals(e instanceof Deno.errors.InvalidData, true)
  }
  assertEquals(thrown, true)
})

Deno.test('Handler maxRouteParamLength with NaN throws InvalidData', () => {
  let thrown = false
  try {
    new Routing.Handler({ maxParamLength: NaN })
  } catch (e) {
    thrown = true
    assertEquals(e instanceof Deno.errors.InvalidData, true)
  }
  assertEquals(thrown, true)
})

Deno.test('Handler maxRouteParamLength with negative throws InvalidData', () => {
  let thrown = false
  try {
    new Routing.Handler({ maxParamLength: -5 })
  } catch (e) {
    thrown = true
    assertEquals(e instanceof Deno.errors.InvalidData, true)
  }
  assertEquals(thrown, true)
})

Deno.test('Handler maxRouteParamLength with zero throws InvalidData', () => {
  let thrown = false
  try {
    new Routing.Handler({ maxParamLength: 0 })
  } catch (e) {
    thrown = true
    assertEquals(e instanceof Deno.errors.InvalidData, true)
  }
  assertEquals(thrown, true)
})

Deno.test('Handler maxUrlLength 414 returns HTML without Accept json', async () => {
  const handler = new Routing.Handler({ maxUrlLength: 30 })
  const longPath = 'a'.repeat(50)
  const res = await handler.createHandler()(new Request(`http://localhost/${longPath}`))
  assertEquals(res.status, 414)
  assertEquals(res.headers.get('Content-Type'), 'text/html; charset=utf-8')
})

Deno.test('Handler maxUrlLength 414 returns JSON when Accept json', async () => {
  const handler = new Routing.Handler({ maxUrlLength: 30 })
  const longPath = 'a'.repeat(50)
  const res = await handler.createHandler()(
    new Request(`http://localhost/${longPath}`, {
      headers: new Headers({ Accept: 'application/json' })
    })
  )
  assertEquals(res.status, 414)
  const body = (await res.json()) as { error: string }
  assertEquals(body.error, 'URI Too Long')
})

Deno.test('Handler maxUrlLength returns 414 when exceeded', async () => {
  const handler = new Routing.Handler({ maxUrlLength: 50 })
  const longPath = 'a'.repeat(200)
  const res = await handler.createHandler()(new Request(`http://localhost/${longPath}`))
  assertEquals(res.status, 414)
})

Deno.test('Handler maxUrlLength with Infinity throws InvalidData', () => {
  let thrown = false
  try {
    new Routing.Handler({ maxUrlLength: Infinity })
  } catch (e) {
    thrown = true
    assertEquals(e instanceof Deno.errors.InvalidData, true)
  }
  assertEquals(thrown, true)
})

Deno.test('Handler maxUrlLength with NaN throws InvalidData', () => {
  let thrown = false
  try {
    new Routing.Handler({ maxUrlLength: NaN })
  } catch (e) {
    thrown = true
    assertEquals(e instanceof Deno.errors.InvalidData, true)
  }
  assertEquals(thrown, true)
})

Deno.test('Handler maxUrlLength with negative throws InvalidData', () => {
  let thrown = false
  try {
    new Routing.Handler({ maxUrlLength: -100 })
  } catch (e) {
    thrown = true
    assertEquals(e instanceof Deno.errors.InvalidData, true)
  }
  assertEquals(thrown, true)
})

Deno.test('Handler maxUrlLength with zero throws InvalidData', () => {
  let thrown = false
  try {
    new Routing.Handler({ maxUrlLength: 0 })
  } catch (e) {
    thrown = true
    assertEquals(e instanceof Deno.errors.InvalidData, true)
  }
  assertEquals(thrown, true)
})

Deno.test('Handler middleware * matches all paths', async () => {
  const handler = new Routing.Handler()
  handler.addMiddleware('*', async (ctx, next) => {
    ctx.setHeader('X-Global', 'yes')
    return await next()
  })
  handler.addMiddleware(
    '',
    async (ctx) => new Response(ctx[Core.InternalContext].responseHeadersMap['X-Global'] ?? 'no')
  )
  const handle = handler.createHandler()
  const res = await handle(new Request('http://localhost/anything'))
  assertEquals(await res.text(), 'yes')
})

Deno.test('Handler middleware calling next() twice surfaces a 500 instead of silently swallowing', async () => {
  const handler = new Routing.Handler()
  let downstreamRuns = 0
  handler.addMiddleware('', async (_ctx, next) => {
    await next()
    return await next()
  })
  handler.addMiddleware('', (_ctx, next) => {
    downstreamRuns++
    return next()
  })
  const handle = handler.createHandler()
  const res = await handle(new Request('http://localhost/'))
  assertEquals(res.status, 500)
  assertEquals(downstreamRuns, 1)
})

Deno.test('Handler middleware chain runs in order', async () => {
  const handler = new Routing.Handler()
  const order: number[] = []
  handler.addMiddleware('', async (_ctx, next) => {
    order.push(1)
    return await next()
  })
  handler.addMiddleware('', async (_ctx, next) => {
    order.push(2)
    return await next()
  })
  handler.addMiddleware('', async () => {
    order.push(3)
    return new Response('done')
  })
  const handle = handler.createHandler()
  await handle(new Request('http://localhost/'))
  assertEquals(order, [1, 2, 3])
})

Deno.test('Handler middleware returning a prototype-only fake Response yields a masked 500', async () => {
  const handler = new Routing.Handler()
  const fake = Object.create(Response.prototype) as Response
  handler.addMiddleware('', () => fake)
  const handle = handler.createHandler()
  const res = await handle(new Request('http://localhost/'))
  assertEquals(res.status, 500)
  assertEquals(await res.text() !== '', true)
})

Deno.test('Handler middleware returning undefined after next() does not double-dispatch downstream', async () => {
  const handler = new Routing.Handler()
  let secondRuns = 0
  handler.addMiddleware('', async (_ctx, next) => {
    await next()
    return undefined
  })
  handler.addMiddleware('', (_ctx, next) => {
    secondRuns++
    return next()
  })
  const handle = handler.createHandler()
  const res = await handle(new Request('http://localhost/'))
  assertEquals(res.status, 404)
  assertEquals(secondRuns, 1)
})

Deno.test('Handler middleware returns response stops chain', async () => {
  const handler = new Routing.Handler()
  let secondCalled = false
  handler.addMiddleware('', async () => {
    return new Response('stopped')
  })
  handler.addMiddleware('', async (_ctx, next) => {
    secondCalled = true
    return await next()
  })
  const handle = handler.createHandler()
  const res = await handle(new Request('http://localhost/'))
  assertEquals(await res.text(), 'stopped')
  assertEquals(secondCalled, false)
})

Deno.test('Handler middleware wildcard /** matches deep paths', async () => {
  const handler = new Routing.Handler()
  handler.addMiddleware('/api/**', async (ctx, next) => {
    ctx.setHeader('X-API', 'true')
    return await next()
  })
  handler.addMiddleware(
    '',
    async (ctx) => new Response(ctx[Core.InternalContext].responseHeadersMap['X-API'] ?? 'no')
  )
  const handle = handler.createHandler()
  const res = await handle(new Request('http://localhost/api/v1/users/123'))
  assertEquals(await res.text(), 'true')
})

Deno.test('Handler raw Response keeps its own header over a middleware default', async () => {
  const handler = new Routing.Handler()
  handler.addMiddleware('', (ctx: Core.Context, next) => {
    ctx.setHeader('Content-Type', 'application/xml')
    return next()
  })
  ;(
    handler as unknown as { routerInstance: { add: (m: string, p: string, d: unknown) => void } }
  ).routerInstance.add('GET', '/raw2', {
    handler: () => new Response('hi', { headers: { 'Content-Type': 'text/plain' } })
  })
  const res = await handler.createHandler()(new Request('http://localhost/raw2'))
  assertEquals(res.headers.get('Content-Type'), 'text/plain')
  await res.body?.cancel()
})

Deno.test('Handler request events carry the direct peer IP in metadata', async () => {
  const handler = new Routing.Handler()
  const events: Types.EventBase[] = []
  handler.onEvent((event) => events.push(event))
  handler.addMiddleware('', () => {
    throw new Error('boom')
  })
  const info = {
    remoteAddr: { transport: 'tcp', hostname: '198.51.100.7', port: 1 }
  } as Deno.ServeHandlerInfo
  const res = await handler.createHandler()(new Request('http://localhost/'), info)
  await res.body?.cancel()
  const errorEvent = events.find((e) => e.kind === 'request:error')
  assertEquals(errorEvent?.kind === 'request:error' && errorEvent.metadata.ip, '198.51.100.7')
})

Deno.test('Handler request events carry the matched route pattern, server authority, and user agent', async () => {
  const handler = new Routing.Handler()
  const routerInstance = (
    handler as unknown as { routerInstance: { add: (m: string, p: string, d: unknown) => void } }
  ).routerInstance
  routerInstance.add('GET', '/users/:id', {
    kind: 'handler',
    pattern: '/users/:id',
    handler: () => new Response('u', { headers: { 'content-length': '1' } })
  })
  const events: Types.EventBase[] = []
  handler.onEvent((event) => events.push(event))
  const res = await handler.createHandler()(
    new Request('http://api.example.com:8080/users/42', {
      headers: { 'user-agent': 'curl/8', 'content-length': '0' }
    })
  )
  await res.body?.cancel()
  const complete = events.find((e) => e.kind === 'request:complete')
  if (complete?.kind !== 'request:complete') {
    throw new Error('missing request:complete event')
  }
  assertEquals(complete.metadata.route, '/users/:id')
  assertEquals(complete.metadata.serverAddress, 'api.example.com')
  assertEquals(complete.metadata.serverPort, 8080)
  assertEquals(complete.metadata.userAgent, 'curl/8')
  assertEquals(complete.metadata.requestSize, 0)
  assertEquals(complete.metadata.responseSize, 1)
})

Deno.test('Handler request events carry the trusted-proxy-resolved client IP, not the proxy', async () => {
  const handler = new Routing.Handler({ trustProxy: ['loopback'] })
  const events: Types.EventBase[] = []
  handler.onEvent((event) => events.push(event))
  handler.addMiddleware('', () => new Response('ok'))
  const info = {
    remoteAddr: { transport: 'tcp', hostname: '127.0.0.1', port: 1 }
  } as Deno.ServeHandlerInfo
  const res = await handler.createHandler()(
    new Request('http://localhost/', { headers: { 'x-forwarded-for': '203.0.113.99' } }),
    info
  )
  await res.body?.cancel()
  const complete = events.find((e) => e.kind === 'request:complete')
  assertEquals(complete?.kind === 'request:complete' && complete.metadata.ip, '203.0.113.99')
})

Deno.test('Handler request events omit ip when the peer is unknown', async () => {
  const handler = new Routing.Handler()
  const events: Types.EventBase[] = []
  handler.onEvent((event) => events.push(event))
  handler.addMiddleware('', () => new Response('ok'))
  const res = await handler.createHandler()(new Request('http://localhost/'))
  await res.body?.cancel()
  const complete = events.find((e) => e.kind === 'request:complete')
  assertEquals(complete?.kind === 'request:complete' && 'ip' in complete.metadata, false)
})

Deno.test('Handler request events omit responseSize and userAgent when unknown', async () => {
  const handler = new Routing.Handler()
  const events: Types.EventBase[] = []
  handler.onEvent((event) => events.push(event))
  handler.addMiddleware(
    '',
    () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array([1]))
            controller.close()
          }
        })
      )
  )
  const res = await handler.createHandler()(new Request('http://localhost/stream'))
  await res.body?.cancel()
  const complete = events.find((e) => e.kind === 'request:complete')
  if (complete?.kind !== 'request:complete') {
    throw new Error('missing request:complete event')
  }
  assertEquals('responseSize' in complete.metadata, false)
  assertEquals('userAgent' in complete.metadata, false)
})

Deno.test('Handler request events omit the route pattern when no route matches', async () => {
  const handler = new Routing.Handler()
  const events: Types.EventBase[] = []
  handler.onEvent((event) => events.push(event))
  const res = await handler.createHandler()(new Request('http://localhost/nope'))
  await res.body?.cancel()
  const complete = events.find((e) => e.kind === 'request:complete')
  assertEquals(complete?.kind === 'request:complete' && 'route' in complete.metadata, false)
})

Deno.test('Handler requestTimeoutMs returns 503 when exceeded', async () => {
  const handler = new Routing.Handler({ requestTimeoutMs: 5 })
  handler.addMiddleware('', async () => {
    await new Promise((r) => setTimeout(r, 20))
    return new Response('late')
  })
  const res = await handler.createHandler()(new Request('http://localhost/'))
  assertEquals(res.status, 503)
  await res.body?.cancel()
  await new Promise((r) => setTimeout(r, 30))
})

Deno.test('Handler returns 404 (not 405) for a path that exists under no method', async () => {
  const handler = new Routing.Handler()
  const routerInstance = (
    handler as unknown as { routerInstance: { add: (m: string, p: string, d: unknown) => void } }
  ).routerInstance
  routerInstance.add('GET', '/items', {
    handler: () => new Response('ok'),
    pattern: '/items'
  })
  const res = await handler.createHandler()(
    new Request('http://localhost/unknown', { method: 'DELETE' })
  )
  assertEquals(res.status, 404)
  await res.body?.cancel()
})

Deno.test('Handler returns 405 when path exists under a different method', async () => {
  const handler = new Routing.Handler()
  const routerInstance = (
    handler as unknown as { routerInstance: { add: (m: string, p: string, d: unknown) => void } }
  ).routerInstance
  routerInstance.add('GET', '/items', {
    handler: () => new Response('ok'),
    pattern: '/items'
  })
  const res = await handler.createHandler()(
    new Request('http://localhost/items', { method: 'DELETE' })
  )
  assertEquals(res.status, 405)
  await res.body?.cancel()
})

Deno.test('Handler route error with statusCode uses thrown statusCode', async () => {
  const handler = new Routing.Handler()
  const routerInstance = (
    handler as unknown as { routerInstance: { add: (m: string, p: string, d: unknown) => void } }
  ).routerInstance
  routerInstance.add('GET', '/fail', {
    handler: () => {
      const err = new Error('bad request') as Types.StatusError
      err.statusCode = 400
      throw err
    },
    pattern: '/fail'
  })
  const res = await handler.createHandler()(new Request('http://localhost/fail'))
  assertEquals(res.status, 400)
  await res.body?.cancel()
})

Deno.test('Handler route error without statusCode defaults to 500', async () => {
  const handler = new Routing.Handler()
  const routerInstance = (
    handler as unknown as { routerInstance: { add: (m: string, p: string, d: unknown) => void } }
  ).routerInstance
  routerInstance.add('GET', '/fail', {
    handler: () => {
      throw new Error('internal')
    },
    pattern: '/fail'
  })
  const res = await handler.createHandler()(new Request('http://localhost/fail'))
  assertEquals(res.status, 500)
  await res.body?.cancel()
})

Deno.test('Handler routes a non-Response middleware return through the error pipeline', async () => {
  const handler = new Routing.Handler()
  handler.addMiddleware('', () => 'not a response' as unknown as Response)
  const res = await handler.createHandler()(new Request('http://localhost/'))
  assertEquals(res.status, 500)
  await res.body?.cancel()
})

Deno.test('Handler setErrorBuilder overrides error response', async () => {
  const handler = new Routing.Handler()
  handler.setErrorBuilder({
    build: async (_ctx, statusCode) => new Response('custom error', { status: statusCode })
  })
  const res = await handler.createHandler()(new Request('http://localhost/nonexistent'))
  assertEquals(res.status, 404)
  assertEquals(await res.text(), 'custom error')
})

Deno.test('Handler setErrorMiddleware sets custom error handler', async () => {
  const handler = new Routing.Handler()
  let errorMiddlewareCalled = false
  handler.setErrorMiddleware(async (_ctx, errorInfo) => {
    errorMiddlewareCalled = true
    return new Response('custom not found', { status: errorInfo.statusCode })
  })
  const handle = handler.createHandler()
  const res = await handle(new Request('http://localhost/nonexistent'))
  assertEquals(res.status, 404)
  assertEquals(errorMiddlewareCalled, true)
  assertEquals(await res.text(), 'custom not found')
})

Deno.test('Handler stops the chain and masks 500 when a chained middleware returns a non-Response value', async () => {
  const handler = new Routing.Handler()
  let secondRan = false
  handler.addMiddleware('', () => 42 as unknown as Response)
  handler.addMiddleware('', () => {
    secondRan = true
    return new Response('ok')
  })
  const res = await handler.createHandler()(new Request('http://localhost/'))
  assertEquals(res.status, 500)
  assertEquals(secondRan, false)
  await res.body?.cancel()
})

Deno.test('Handler timeout emits request:error event with status 503', async () => {
  const handler = new Routing.Handler({ requestTimeoutMs: 5 })
  const events: Types.EventBase[] = []
  handler.onEvent((event) => events.push(event))
  handler.addMiddleware('', async () => {
    await new Promise((r) => setTimeout(r, 20))
    return new Response('late')
  })
  const res = await handler.createHandler()(new Request('http://localhost/'))
  assertEquals(res.status, 503)
  await res.body?.cancel()
  await new Promise((r) => setTimeout(r, 30))
  const timeoutEvent = events.find((e) => e.kind === 'request:error')
  assertEquals(timeoutEvent !== undefined, true)
  assertEquals(timeoutEvent?.kind === 'request:error' && timeoutEvent.metadata.statusCode, 503)
  assertEquals(timeoutEvent?.type, 'internal')
  assertEquals(
    timeoutEvent?.kind === 'request:error' &&
      timeoutEvent.metadata.error instanceof Deno.errors.TimedOut,
    true
  )
  assertEquals(
    timeoutEvent?.kind === 'request:error' && typeof timeoutEvent.metadata.durationMs,
    'number'
  )
})

Deno.test('Handler viewsDir sets ctx.state.view and can render', async () => {
  const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(
    /[\\/]$/,
    ''
  )
  const handler = new Routing.Handler({ viewsDir })
  handler.addMiddleware('', async (ctx) => {
    const engine = ctx.getState(Handler.stateKeys.view) as {
      render: (p: string, d?: unknown) => Promise<string>
    }
    const html = await engine.render('hello.dve', { name: 'DX' } as Record<string, unknown>)
    return new Response(html)
  })
  const res = await handler.createHandler()(new Request('http://localhost/'))
  assertEquals(await res.text(), 'Hello DX.\n')
})

Deno.test('Handler without timeout does not return 503', async () => {
  const handler = new Routing.Handler()
  handler.addMiddleware('', async () => {
    await new Promise((r) => setTimeout(r, 5))
    return new Response('ok')
  })
  const res = await handler.createHandler()(new Request('http://localhost/'))
  assertEquals(res.status, 200)
  assertEquals(await res.text(), 'ok')
})

Deno.test('Handler#addMiddleware throws a TypeError when the handler is not a function', () => {
  const handler = new Routing.Handler()
  const invalidHandlers: unknown[] = ['notfn', undefined, null, 123, {}]
  for (const invalid of invalidHandlers) {
    let caught: unknown = null
    try {
      handler.addMiddleware('/a', invalid as never)
    } catch (e) {
      caught = e
    }
    assertEquals(caught instanceof TypeError, true)
    assertEquals((caught as Error).message.includes('must be a function'), true)
  }
})

Deno.test('Handler#addStaticRoute returns 405 for non-GET methods on a static path', async () => {
  const staticBasePath = fileURLToPath(import.meta.resolve('@tests/fixtures/static/')).replace(
    /[\\/]$/,
    ''
  )
  const handler = new Routing.Handler()
  handler.addStaticRoute('/static', { path: staticBasePath })
  const handle = handler.createHandler()
  const post = await handle(
    new Request('http://localhost/static/index.html', { method: 'POST' })
  )
  assertEquals(post.status, 405)
  assertEquals(post.headers.get('Allow'), 'GET, HEAD')
  await post.body?.cancel()
  const del = await handle(
    new Request('http://localhost/static/index.html', { method: 'DELETE' })
  )
  assertEquals(del.status, 405)
  await del.body?.cancel()
})

Deno.test('Handler#addStaticRoute serves static files', async () => {
  const staticBasePath = fileURLToPath(import.meta.resolve('@tests/fixtures/static/')).replace(
    /[\\/]$/,
    ''
  )
  const handler = new Routing.Handler()
  handler.addStaticRoute('/static', { path: staticBasePath })
  const handle = handler.createHandler()
  const res = await handle(new Request('http://localhost/static/index.html'))
  assertEquals(res.status, 200)
  const text = await res.text()
  assertEquals(text.includes('static fixture'), true)
})

Deno.test('Handler#addStaticRoute throws a TypeError when path option is not a non-empty string', () => {
  const handler = new Routing.Handler()
  const invalidPaths: unknown[] = [123, '', undefined, null]
  for (const invalid of invalidPaths) {
    let caught: unknown = null
    try {
      handler.addStaticRoute('/s', { path: invalid as string })
    } catch (e) {
      caught = e
    }
    assertEquals(caught instanceof TypeError, true)
    assertEquals((caught as Error).message.includes('non-empty string'), true)
  }
})

Deno.test('Handler#createHandler with worker option sets ctx.state.worker', async () => {
  const handler = new Routing.Handler({
    worker: { scriptURL: echoWorkerUrl, poolSize: 1 }
  })
  handler.addMiddleware('', async (ctx, next) => {
    const workerHandle = ctx.getState(Handler.stateKeys.worker)
    if (
      workerHandle &&
      typeof (workerHandle as { run?: unknown }).run === 'function'
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

Deno.test('Handler#getViewEngine returns engine when viewsDir set', () => {
  const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(
    /[\\/]$/,
    ''
  )
  const handler = new Routing.Handler({ viewsDir })
  const engine = handler.getViewEngine()
  assertEquals(engine !== undefined, true)
})

Deno.test('Handler#getViewEngine returns undefined when viewsDir not set', () => {
  const handler = new Routing.Handler()
  assertEquals(handler.getViewEngine(), undefined)
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

Deno.test('Handler#handleResponse when errorMiddleware returns non-Response falls through to safe default', async () => {
  const handler = new Routing.Handler()
  handler.setErrorMiddleware(
    (() => 'broke') as unknown as Types.ErrorMiddleware
  )
  const ctx = createTestContext('http://localhost/oops', {
    headers: new Headers({ Accept: 'application/json' })
  })
  const res = await handler.handleResponse(ctx, 500, new Error('boom'))
  assertEquals(res.status, 500)
  const body = (await res.json()) as { error: string; path: string; statusCode: number }
  assertEquals(body.statusCode, 500)
  assertEquals(body.path, '/oops')
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
  assertEquals(responseBody.error, 'Not Found')
  assertEquals(responseBody.path, '/foo')
  assertEquals(responseBody.statusCode, 404)
})

Deno.test('Handler#removeRoute for non-existent pattern does not throw', () => {
  const handler = new Routing.Handler()
  handler.removeRoute('/never-added')
})

Deno.test('Handler#removeRoute removes route so it returns 404', async () => {
  const handler = new Routing.Handler()
  const routerInstance = (
    handler as unknown as { routerInstance: { add: (m: string, p: string, d: unknown) => void } }
  ).routerInstance
  routerInstance.add('GET', '/test', {
    handler: () => new Response('ok'),
    pattern: '/test'
  })
  const handle = handler.createHandler()
  const res1 = await handle(new Request('http://localhost/test'))
  assertEquals(res1.status, 200)
  await res1.body?.cancel()
  handler.removeRoute('/test')
  const res2 = await handle(new Request('http://localhost/test'))
  assertEquals(res2.status, 404)
  await res2.body?.cancel()
})

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
    assertEquals((e as Error).message.includes('must export at least one HTTP method'), true)
  }
  assertEquals(thrown, true)
})
