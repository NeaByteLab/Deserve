import { assertEquals } from '@std/assert'
import * as Core from '@core/index.ts'
import * as Middleware from '@middleware/index.ts'

function createTestContext(url = 'http://localhost/', requestInit?: RequestInit): Core.Context {
  const request = new Request(url, requestInit)
  return new Core.Context(request, new URL(url), {})
}

Deno.test('bodyLimit Content-Length exactly at limit passes through', async () => {
  const middleware = Middleware.Mware.bodyLimit({ limit: 100 })
  const ctx = createTestContext('http://localhost/', {
    method: 'POST',
    headers: new Headers({ 'Content-Length': '100' })
  })
  const next = async (): Promise<Response> => new Response('ok')
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(await res.text(), 'ok')
  }
})

Deno.test('bodyLimit Content-Length NaN returns 413', async () => {
  const middleware = Middleware.Mware.bodyLimit({ limit: 100 })
  const ctx = createTestContext('http://localhost/', {
    method: 'POST',
    headers: new Headers({ 'Content-Length': 'not-a-number' })
  })
  const next = async (): Promise<Response> => new Response('ok')
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(res.status, 413)
  }
})

Deno.test('bodyLimit Content-Length one byte over limit returns 413', async () => {
  const middleware = Middleware.Mware.bodyLimit({ limit: 100 })
  const ctx = createTestContext('http://localhost/', {
    method: 'POST',
    headers: new Headers({ 'Content-Length': '101' })
  })
  const next = async (): Promise<Response> => new Response()
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(res.status, 413)
  }
})

Deno.test('bodyLimit Content-Length with trailing text returns 413', async () => {
  const middleware = Middleware.Mware.bodyLimit({ limit: 200 })
  const ctx = createTestContext('http://localhost/', {
    method: 'POST',
    headers: new Headers({ 'Content-Length': '100abc' })
  })
  const next = (): Promise<Response> => Promise.resolve(new Response('ok'))
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(res.status, 413)
  }
})

Deno.test('bodyLimit Content-Length zero passes through', async () => {
  const middleware = Middleware.Mware.bodyLimit({ limit: 100 })
  const ctx = createTestContext('http://localhost/', {
    method: 'POST',
    headers: new Headers({ 'Content-Length': '0' })
  })
  const next = async (): Promise<Response> => new Response('ok')
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(await res.text(), 'ok')
  }
})

Deno.test('bodyLimit default limit is 1MB when not specified', async () => {
  const middleware = Middleware.Mware.bodyLimit({ limit: undefined } as unknown as {
    limit: number
  })
  const ctx = createTestContext('http://localhost/', {
    method: 'POST',
    headers: new Headers({ 'Content-Length': String(1024 * 1024) })
  })
  const next = async (): Promise<Response> => new Response('ok')
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(await res.text(), 'ok')
  }
})

Deno.test('bodyLimit DELETE method is checked', async () => {
  const middleware = Middleware.Mware.bodyLimit({ limit: 10 })
  const ctx = createTestContext('http://localhost/', {
    method: 'DELETE',
    headers: new Headers({ 'Content-Length': '100' })
  })
  const next = async (): Promise<Response> => new Response()
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(res.status, 413)
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

Deno.test('bodyLimit HEAD passes through', async () => {
  const middleware = Middleware.Mware.bodyLimit({ limit: 100 })
  const ctx = createTestContext('http://localhost/', { method: 'HEAD' })
  const next = async (): Promise<Response> => new Response('ok')
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(await res.text(), 'ok')
  }
})

Deno.test('bodyLimit negative Content-Length returns 413', async () => {
  const middleware = Middleware.Mware.bodyLimit({ limit: 100 })
  const ctx = createTestContext('http://localhost/', {
    method: 'POST',
    headers: new Headers({ 'Content-Length': '-1' })
  })
  const next = (): Promise<Response> => Promise.resolve(new Response('ok'))
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(res.status, 413)
  }
})

Deno.test('bodyLimit PATCH method is checked', async () => {
  const middleware = Middleware.Mware.bodyLimit({ limit: 10 })
  const ctx = createTestContext('http://localhost/', {
    method: 'PATCH',
    headers: new Headers({ 'Content-Length': '100' })
  })
  const next = async (): Promise<Response> => new Response()
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(res.status, 413)
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

Deno.test('bodyLimit POST with no body passes through', async () => {
  const middleware = Middleware.Mware.bodyLimit({ limit: 100 })
  const ctx = createTestContext('http://localhost/', { method: 'POST' })
  const next = async (): Promise<Response> => new Response('ok')
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(await res.text(), 'ok')
  }
})

Deno.test('bodyLimit PUT method is checked', async () => {
  const middleware = Middleware.Mware.bodyLimit({ limit: 10 })
  const ctx = createTestContext('http://localhost/', {
    method: 'PUT',
    headers: new Headers({ 'Content-Length': '100' })
  })
  const next = async (): Promise<Response> => new Response()
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(res.status, 413)
  }
})

Deno.test('bodyLimit streaming body exactly at limit passes', async () => {
  const middleware = Middleware.Mware.bodyLimit({ limit: 6 })
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
    assertEquals(await res.text(), 'ok')
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

Deno.test('bodyLimit streaming body with single chunk under limit passes', async () => {
  const middleware = Middleware.Mware.bodyLimit({ limit: 10 })
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('hello'))
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
    assertEquals(await res.text(), 'ok')
  }
})

Deno.test('bodyLimit with limit 0 rejects any body', async () => {
  const middleware = Middleware.Mware.bodyLimit({ limit: 0 })
  const ctx = createTestContext('http://localhost/', {
    method: 'POST',
    headers: new Headers({ 'Content-Length': '1' })
  })
  const next = async (): Promise<Response> => new Response()
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(res.status, 413)
  }
})

Deno.test('bodyLimit with Transfer-Encoding skips Content-Length check', async () => {
  const middleware = Middleware.Mware.bodyLimit({ limit: 10 })
  const ctx = createTestContext('http://localhost/', {
    method: 'POST',
    headers: new Headers({
      'Content-Length': '100',
      'Transfer-Encoding': 'chunked'
    })
  })
  const next = async (): Promise<Response> => new Response('ok')
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(await res.text(), 'ok')
  }
})
