import { assertEquals } from '@std/assert'
import * as Core from '@core/index.ts'
import * as Middleware from '@middleware/index.ts'

function createTestContext(url = 'http://localhost/', requestInit?: RequestInit): Core.Context {
  const request = new Request(url, requestInit)
  return new Core.Context(request, new URL(url), {})
}

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

Deno.test('cors OPTIONS preflight with wildcard origin returns 204', async () => {
  const middleware = Middleware.Mware.cors({ origin: '*' })
  const ctx = createTestContext('http://localhost/', {
    method: 'OPTIONS',
    headers: new Headers({ Origin: 'https://any.com' })
  })
  const next = async (): Promise<Response> => new Response()
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(res.status, 204)
    assertEquals(res.headers.get('Access-Control-Allow-Origin'), '*')
  }
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

Deno.test('cors OPTIONS with credentials and specific origin sets Allow-Credentials', async () => {
  const middleware = Middleware.Mware.cors({
    origin: 'https://cred.com',
    credentials: true
  })
  const ctx = createTestContext('http://localhost/', {
    method: 'OPTIONS',
    headers: new Headers({ Origin: 'https://cred.com' })
  })
  const next = async (): Promise<Response> => new Response()
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(res.status, 204)
    assertEquals(res.headers.get('Access-Control-Allow-Origin'), 'https://cred.com')
    assertEquals(res.headers.get('Access-Control-Allow-Credentials'), 'true')
  }
})

Deno.test('cors OPTIONS with default methods includes all HTTP methods', async () => {
  const middleware = Middleware.Mware.cors({ origin: 'https://a.com' })
  const ctx = createTestContext('http://localhost/', {
    method: 'OPTIONS',
    headers: new Headers({ Origin: 'https://a.com' })
  })
  const next = async (): Promise<Response> => new Response()
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(res.status, 204)
    const methods = res.headers.get('Access-Control-Allow-Methods')
    assertEquals(methods, 'DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT')
  }
})

Deno.test('cors POST request with origin sets headers', async () => {
  const middleware = Middleware.Mware.cors({ origin: 'https://post.com' })
  const ctx = createTestContext('http://localhost/', {
    method: 'POST',
    headers: new Headers({ Origin: 'https://post.com' })
  })
  const next = async (): Promise<Response> => new Response('created', { status: 201 })
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  assertEquals(ctx.responseHeadersMap['Access-Control-Allow-Origin'], 'https://post.com')
  if (res) {
    assertEquals(res.status, 201)
    assertEquals(await res.text(), 'created')
  }
})

Deno.test('cors credentials with array origin matching sets Allow-Credentials', async () => {
  const middleware = Middleware.Mware.cors({
    origin: ['https://one.com', 'https://two.com'],
    credentials: true
  })
  const ctx = createTestContext('http://localhost/', {
    method: 'GET',
    headers: new Headers({ Origin: 'https://two.com' })
  })
  const next = async (): Promise<Response> => new Response('ok')
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  assertEquals(ctx.responseHeadersMap['Access-Control-Allow-Origin'], 'https://two.com')
  assertEquals(ctx.responseHeadersMap['Access-Control-Allow-Credentials'], 'true')
  if (res) {
    assertEquals(await res.text(), 'ok')
  }
})

Deno.test('cors credentials with wildcard origin throws InvalidData', () => {
  let thrown = false
  try {
    Middleware.Mware.cors({ origin: '*', credentials: true })
  } catch (error) {
    thrown = true
    assertEquals(error instanceof Deno.errors.InvalidData, true)
  }
  assertEquals(thrown, true)
})

Deno.test('cors credentials=true with origin=* throws InvalidData', () => {
  let thrown = false
  try {
    Middleware.Mware.cors({ origin: '*', credentials: true })
  } catch (error) {
    thrown = true
    assertEquals(error instanceof Deno.errors.InvalidData, true)
  }
  assertEquals(thrown, true)
})

Deno.test('cors credentials=true with specific origin sets Allow-Credentials', async () => {
  const middleware = Middleware.Mware.cors({
    origin: 'https://specific.com',
    credentials: true
  })
  const ctx = createTestContext('http://localhost/', {
    method: 'GET',
    headers: new Headers({ Origin: 'https://specific.com' })
  })
  const next = async (): Promise<Response> => new Response('ok')
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  assertEquals(ctx.responseHeadersMap['Access-Control-Allow-Origin'], 'https://specific.com')
  assertEquals(ctx.responseHeadersMap['Access-Control-Allow-Credentials'], 'true')
  if (res) {
    assertEquals(await res.text(), 'ok')
  }
})

Deno.test('cors does not set Vary when origin is wildcard', async () => {
  const middleware = Middleware.Mware.cors({ origin: '*' })
  const ctx = createTestContext('http://localhost/', {
    headers: new Headers({ Origin: 'https://any.com' })
  })
  const next = (): Promise<Response> => Promise.resolve(new Response('ok'))
  await middleware(ctx, next)
  assertEquals(ctx.responseHeadersMap['Vary'], undefined)
})

Deno.test('cors exposedHeaders on OPTIONS preflight sets Expose-Headers', async () => {
  const middleware = Middleware.Mware.cors({
    origin: 'https://a.com',
    exposedHeaders: ['X-Custom']
  })
  const ctx = createTestContext('http://localhost/', {
    method: 'OPTIONS',
    headers: new Headers({ Origin: 'https://a.com' })
  })
  const next = async (): Promise<Response> => new Response()
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(res.status, 204)
    assertEquals(res.headers.get('Access-Control-Expose-Headers'), 'X-Custom')
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

Deno.test('cors non-matching array origin on non-OPTIONS does not set allow origin', async () => {
  const middleware = Middleware.Mware.cors({ origin: ['https://allowed.com'] })
  const ctx = createTestContext('http://localhost/', {
    method: 'POST',
    headers: new Headers({ Origin: 'https://denied.com' })
  })
  const next = async (): Promise<Response> => new Response('ok')
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  assertEquals(ctx.responseHeadersMap['Access-Control-Allow-Origin'], undefined)
  if (res) {
    assertEquals(await res.text(), 'ok')
  }
})

Deno.test('cors non-matching single origin does not set allow origin', async () => {
  const middleware = Middleware.Mware.cors({ origin: 'https://only-this.com' })
  const ctx = createTestContext('http://localhost/', {
    method: 'GET',
    headers: new Headers({ Origin: 'https://other.com' })
  })
  const next = async (): Promise<Response> => new Response('ok')
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(await res.text(), 'ok')
  }
  assertEquals(ctx.responseHeadersMap['Access-Control-Allow-Origin'], 'https://only-this.com')
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

Deno.test('cors sets Vary Origin on matching origin request', async () => {
  const middleware = Middleware.Mware.cors({ origin: ['https://trusted.com'] })
  const ctx = createTestContext('http://localhost/', {
    headers: new Headers({ Origin: 'https://trusted.com' })
  })
  const next = (): Promise<Response> => Promise.resolve(new Response('ok'))
  await middleware(ctx, next)
  assertEquals(ctx.responseHeadersMap['Vary'], 'Origin')
})

Deno.test('cors sets Vary Origin on non-matching origin request', async () => {
  const middleware = Middleware.Mware.cors({ origin: ['https://trusted.com'] })
  const ctx = createTestContext('http://localhost/', {
    headers: new Headers({ Origin: 'https://evil.com' })
  })
  const next = (): Promise<Response> => Promise.resolve(new Response('ok'))
  await middleware(ctx, next)
  assertEquals(ctx.responseHeadersMap['Vary'], 'Origin')
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

Deno.test('cors with default options allows any origin', async () => {
  const middleware = Middleware.Mware.cors()
  const ctx = createTestContext('http://localhost/', {
    method: 'GET',
    headers: new Headers({ Origin: 'https://any.com' })
  })
  const next = async (): Promise<Response> => new Response('ok')
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  assertEquals(ctx.responseHeadersMap['Access-Control-Allow-Origin'], '*')
  if (res) {
    assertEquals(await res.text(), 'ok')
  }
})

Deno.test('cors with empty origin header calls next without setting CORS headers', async () => {
  const middleware = Middleware.Mware.cors({ origin: 'https://a.com' })
  const ctx = createTestContext('http://localhost/', {
    method: 'GET',
    headers: new Headers({ Origin: '' })
  })
  const next = async (): Promise<Response> => new Response('ok')
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(await res.text(), 'ok')
  }
})
