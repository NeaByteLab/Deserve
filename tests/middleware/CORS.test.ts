import { assertEquals } from 'jsr:@std/assert'
import * as Core from '@core/index.ts'
import * as Middleware from '@middleware/index.ts'

function createTestContext(url = 'http://localhost/', requestInit?: RequestInit): Core.Context {
  const request = new Request(url, requestInit)
  return new Core.Context(request, new URL(url), {})
}

Deno.test('cors credentials=true with origin=* does not set Allow-Credentials', async () => {
  const middleware = Middleware.Mware.cors({ origin: '*', credentials: true })
  const ctx = createTestContext('http://localhost/', {
    method: 'GET',
    headers: new Headers({ Origin: 'https://site.com' })
  })
  const next = async (): Promise<Response> => new Response('ok')
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  assertEquals(ctx.responseHeadersMap['Access-Control-Allow-Origin'], '*')
  assertEquals(ctx.responseHeadersMap['Access-Control-Allow-Credentials'], undefined)
  if (res) {
    assertEquals(await res.text(), 'ok')
  }
})

Deno.test('cors exposedHeaders sets Access-Control-Expose-Headers', async () => {
  const middleware = Middleware.Mware.cors({
    origin: 'https://a.com',
    exposedHeaders: ['X-RateLimit', 'X-Request-Id']
  })
  const ctx = createTestContext('http://localhost/', {
    method: 'GET',
    headers: new Headers({ Origin: 'https://a.com' })
  })
  const next = async (): Promise<Response> => new Response('ok')
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  assertEquals(ctx.responseHeadersMap['Access-Control-Expose-Headers'], 'X-RateLimit, X-Request-Id')
  if (res) {
    assertEquals(await res.text(), 'ok')
  }
})

Deno.test('cors GET when origin allowed sets header and calls next', async () => {
  const middleware = Middleware.Mware.cors({ origin: 'https://single.com' })
  const ctx = createTestContext('http://localhost/', {
    method: 'GET',
    headers: new Headers({ Origin: 'https://single.com' })
  })
  const next = async (): Promise<Response> => new Response('ok')
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(await res.text(), 'ok')
  }
  assertEquals(ctx.responseHeadersMap['Access-Control-Allow-Origin'], 'https://single.com')
})

Deno.test('cors OPTIONS sets allow methods/headers/max-age', async () => {
  const middleware = Middleware.Mware.cors({
    origin: 'https://a.com',
    methods: ['GET', 'POST'],
    allowedHeaders: ['X-A', 'X-B'],
    maxAge: 600
  })
  const ctx = createTestContext('http://localhost/', {
    method: 'OPTIONS',
    headers: new Headers({ Origin: 'https://a.com' })
  })
  const next = async (): Promise<Response> => new Response('should not')
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(res.status, 204)
    assertEquals(res.headers.get('Access-Control-Allow-Origin'), 'https://a.com')
    assertEquals(res.headers.get('Access-Control-Allow-Methods'), 'GET, POST')
    assertEquals(res.headers.get('Access-Control-Allow-Headers'), 'X-A, X-B')
    assertEquals(res.headers.get('Access-Control-Max-Age'), '600')
  }
})

Deno.test('cors OPTIONS when origin in list returns 204 with CORS headers', async () => {
  const middleware = Middleware.Mware.cors({ origin: ['https://allowed.com'] })
  const ctx = createTestContext('http://localhost/', {
    method: 'OPTIONS',
    headers: new Headers({ Origin: 'https://allowed.com' })
  })
  const next = async (): Promise<Response> => new Response()
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(res.status, 204)
    assertEquals(res.headers.get('Access-Control-Allow-Origin'), 'https://allowed.com')
  }
})

Deno.test('cors OPTIONS when origin not in list returns 403', async () => {
  const middleware = Middleware.Mware.cors({ origin: ['https://allowed.com'] })
  const ctx = createTestContext('http://localhost/', {
    method: 'OPTIONS',
    headers: new Headers({ Origin: 'https://other.com' })
  })
  const next = async (): Promise<Response> => new Response()
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(res.status, 403)
  }
})

Deno.test('cors origin array mismatch does not set allow origin', async () => {
  const middleware = Middleware.Mware.cors({ origin: ['https://allowed.com'] })
  const ctx = createTestContext('http://localhost/', {
    method: 'GET',
    headers: new Headers({ Origin: 'https://not-allowed.com' })
  })
  const next = async (): Promise<Response> => new Response('ok')
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  assertEquals(ctx.responseHeadersMap['Access-Control-Allow-Origin'], undefined)
  if (res) {
    assertEquals(await res.text(), 'ok')
  }
})

Deno.test('cors when no Origin header calls next', async () => {
  const middleware = Middleware.Mware.cors({ origin: 'https://a.com' })
  const ctx = createTestContext('http://localhost/', { method: 'GET' })
  const next = async (): Promise<Response> => new Response('ok')
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(await res.text(), 'ok')
  }
})
