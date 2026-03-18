import { assertEquals } from 'jsr:@std/assert'
import * as Core from '@core/index.ts'
import * as Middleware from '@middleware/index.ts'

function createTestContext(url = 'http://localhost/', requestInit?: RequestInit): Core.Context {
  const request = new Request(url, requestInit)
  return new Core.Context(request, new URL(url), {})
}

Deno.test('bodyLimit Content-Length NaN treated as 0 passes', async () => {
  const middleware = Middleware.Mware.bodyLimit({ limit: 100 })
  const ctx = createTestContext('http://localhost/', {
    method: 'POST',
    headers: new Headers({ 'Content-Length': 'not-a-number' })
  })
  const next = async (): Promise<Response> => new Response('ok')
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(await res.text(), 'ok')
  }
})

Deno.test('bodyLimit GET passes through', async () => {
  const middleware = Middleware.Mware.bodyLimit({ limit: 100 })
  const ctx = createTestContext('http://localhost/', { method: 'GET' })
  const next = async (): Promise<Response> => new Response('ok')
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(await res.text(), 'ok')
  }
})

Deno.test('bodyLimit POST with Content-Length over limit returns 413', async () => {
  const middleware = Middleware.Mware.bodyLimit({ limit: 10 })
  const ctx = createTestContext('http://localhost/', {
    method: 'POST',
    headers: new Headers({ 'Content-Length': '100' })
  })
  const next = async (): Promise<Response> => new Response()
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(res.status, 413)
  }
})

Deno.test('bodyLimit streaming body over limit triggers 413', async () => {
  const middleware = Middleware.Mware.bodyLimit({ limit: 5 })
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('123'))
      controller.enqueue(new TextEncoder().encode('456'))
      controller.close()
    }
  })
  const ctx = createTestContext('http://localhost/', {
    method: 'POST',
    body: stream,
    duplex: 'half'
  } as RequestInit)
  const next = async (): Promise<Response> => {
    await ctx.request.text()
    return new Response('ok')
  }
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(res.status, 413)
    await res.body?.cancel()
  }
})
