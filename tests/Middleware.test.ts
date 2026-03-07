import { assertEquals } from 'jsr:@std/assert'
import { Context, Mware, MwareUtils } from '@app/index.ts'

function createTestContext(url = 'http://localhost/', requestInit?: RequestInit): Context {
  const request = new Request(url, requestInit)
  return new Context(request, new URL(url), {})
}

Deno.test('basicAuth returns 401 when credential has no colon', async () => {
  const middleware = Mware.basicAuth({
    users: [{ username: 'u', password: 'p' }]
  })
  const ctx = createTestContext('http://localhost/', {
    headers: new Headers({ Authorization: 'Basic ' + btoa('nocolon') })
  })
  const next = async (): Promise<Response> => new Response()
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(res.status, 401)
  }
})

Deno.test('basicAuth returns 401 when credential invalid', async () => {
  const middleware = Mware.basicAuth({
    users: [{ username: 'u', password: 'p' }]
  })
  const ctx = createTestContext('http://localhost/', {
    headers: new Headers({ Authorization: 'Basic ' + btoa('wrong:wrong') })
  })
  const next = async (): Promise<Response> => new Response()
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(res.status, 401)
  }
})

Deno.test('basicAuth returns 401 when no Authorization header', async () => {
  const middleware = Mware.basicAuth({
    users: [{ username: 'u', password: 'p' }]
  })
  const ctx = createTestContext()
  const next = async (): Promise<Response> => new Response()
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(res.status, 401)
  }
})

Deno.test('basicAuth throws when users array empty', () => {
  let thrown = false
  try {
    Mware.basicAuth({ users: [] })
  } catch (e) {
    thrown = true
    assertEquals((e as Error).message.includes('users array cannot be empty'), true)
  }
  assertEquals(thrown, true)
})

Deno.test('basicAuth with valid credential calls next', async () => {
  const middleware = Mware.basicAuth({
    users: [{ username: 'u', password: 'p' }]
  })
  const ctx = createTestContext('http://localhost/', {
    headers: new Headers({ Authorization: 'Basic ' + btoa('u:p') })
  })
  const next = async (): Promise<Response> => new Response('ok')
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(await res.text(), 'ok')
  }
})

Deno.test('bodyLimit Content-Length NaN treated as 0 passes', async () => {
  const middleware = Mware.bodyLimit({ limit: 100 })
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
  const middleware = Mware.bodyLimit({ limit: 100 })
  const ctx = createTestContext('http://localhost/', { method: 'GET' })
  const next = async (): Promise<Response> => new Response('ok')
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(await res.text(), 'ok')
  }
})

Deno.test('bodyLimit POST with Content-Length over limit returns 413', async () => {
  const middleware = Mware.bodyLimit({ limit: 10 })
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

Deno.test('cors GET when origin allowed sets header and calls next', async () => {
  const middleware = Mware.cors({ origin: 'https://single.com' })
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

Deno.test('cors OPTIONS when origin in list returns 204 with CORS headers', async () => {
  const middleware = Mware.cors({ origin: ['https://allowed.com'] })
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
  const middleware = Mware.cors({ origin: ['https://allowed.com'] })
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

Deno.test('cors when no Origin header calls next', async () => {
  const middleware = Mware.cors({ origin: 'https://a.com' })
  const ctx = createTestContext('http://localhost/', { method: 'GET' })
  const next = async (): Promise<Response> => new Response('ok')
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(await res.text(), 'ok')
  }
})

Deno.test('MwareUtils#wrapMiddleware calls handleError when middleware throws', async () => {
  const inner = async (): Promise<Response | undefined> => {
    const err = new Error('inner fail') as Error & { statusCode?: number }
    err.statusCode = 422
    throw err
  }
  const wrapped = MwareUtils.wrapMiddleware('Label', inner)
  const request = new Request('http://localhost/')
  const ctx = new Context(request, new URL('http://localhost/'), {}, async (_ctx, status, err) => {
    return new Response(err?.message ?? '', { status })
  })
  const next = async (): Promise<Response> => new Response()
  const res = await wrapped(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(res.status, 422)
    const text = await res.text()
    assertEquals(text.includes('Label'), true)
    assertEquals(text.includes('inner fail'), true)
  }
})

Deno.test('MwareUtils#wrapMiddleware passes through when middleware succeeds', async () => {
  const inner = async (_ctx: Context, next: () => Promise<Response | undefined>) => await next()
  const wrapped = MwareUtils.wrapMiddleware('Test', inner)
  const ctx = createTestContext('http://localhost/')
  const next = async (): Promise<Response> => new Response('ok')
  const res = await wrapped(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(await res.text(), 'ok')
  }
})

Deno.test('securityHeaders can set multiple headers', async () => {
  const middleware = Mware.securityHeaders({
    referrerPolicy: 'strict-origin-when-cross-origin',
    xFrameOptions: 'DENY'
  })
  const ctx = createTestContext()
  const next = async (): Promise<Response> => new Response()
  await middleware(ctx, next)
  assertEquals(ctx.responseHeadersMap['Referrer-Policy'], 'strict-origin-when-cross-origin')
  assertEquals(ctx.responseHeadersMap['X-Frame-Options'], 'DENY')
})

Deno.test('securityHeaders sets configured header and calls next', async () => {
  const middleware = Mware.securityHeaders({ xContentTypeOptions: 'nosniff' })
  const ctx = createTestContext()
  const next = async (): Promise<Response> => new Response('ok')
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(res.status, 200)
    assertEquals(await res.text(), 'ok')
  }
  assertEquals(ctx.responseHeadersMap['X-Content-Type-Options'], 'nosniff')
})

Deno.test('securityHeaders with option false does not set header', async () => {
  const middleware = Mware.securityHeaders({ xContentTypeOptions: false })
  const ctx = createTestContext()
  const next = async (): Promise<Response> => new Response()
  await middleware(ctx, next)
  assertEquals(ctx.responseHeadersMap['X-Content-Type-Options'], undefined)
})

Deno.test('session clearSession sets Max-Age=0', async () => {
  const middleware = Mware.session()
  const ctx = createTestContext('http://localhost/')
  const next = async (): Promise<Response> => {
    ;(ctx.state['clearSession'] as () => void)()
    return new Response()
  }
  await middleware(ctx, next)
  assertEquals(ctx.responseHeadersMap['Set-Cookie']?.includes('Max-Age=0'), true)
})

Deno.test('session setSession sets Set-Cookie header', async () => {
  const middleware = Mware.session()
  const ctx = createTestContext('http://localhost/')
  const next = async (): Promise<Response> => {
    ;(ctx.state['setSession'] as (data: Record<string, unknown>) => void)({ x: 1 })
    return new Response()
  }
  await middleware(ctx, next)
  assertEquals(ctx.responseHeadersMap['Set-Cookie']?.includes('session='), true)
  assertEquals(ctx.responseHeadersMap['Set-Cookie']?.includes('Path=/'), true)
})

Deno.test('session with invalid cookie yields session null', async () => {
  const middleware = Mware.session()
  const ctx = createTestContext('http://localhost/', {
    headers: new Headers({ Cookie: 'session=not-valid-base64-or-json' })
  })
  const next = async (): Promise<Response> => new Response()
  await middleware(ctx, next)
  assertEquals(ctx.state['session'], null)
})

Deno.test('session with valid cookie decodes session data', async () => {
  const payload = encodeURIComponent(JSON.stringify({ userId: 1 }))
  const cookieValue = btoa(payload)
  const middleware = Mware.session()
  const ctx = createTestContext('http://localhost/', {
    headers: new Headers({ Cookie: `session=${cookieValue}` })
  })
  const next = async (): Promise<Response> => new Response()
  await middleware(ctx, next)
  assertEquals((ctx.state['session'] as Record<string, unknown>)?.['userId'], 1)
})
