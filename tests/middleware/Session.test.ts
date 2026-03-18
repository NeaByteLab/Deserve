import { assertEquals } from 'jsr:@std/assert'
import * as Core from '@core/index.ts'
import * as Middleware from '@middleware/index.ts'

function createTestContext(url = 'http://localhost/', requestInit?: RequestInit): Core.Context {
  const request = new Request(url, requestInit)
  return new Core.Context(request, new URL(url), {})
}

const testSecret = 'test-secret-min-32-chars-long'

Deno.test('session clearSession sets Max-Age=0 and path', async () => {
  const middleware = Middleware.Mware.session({ cookieSecret: testSecret, path: '/api' })
  const ctx = createTestContext('http://localhost/')
  await middleware(ctx, async () => {
    ;(ctx.state['clearSession'] as () => void)()
    return new Response()
  })
  const setCookie = ctx.responseHeadersMap['Set-Cookie']
  assertEquals(setCookie?.includes('Max-Age=0'), true)
  assertEquals(setCookie?.includes('Path=/api'), true)
})

Deno.test('session custom cookieName used in Set-Cookie', async () => {
  const middleware = Middleware.Mware.session({ cookieSecret: testSecret, cookieName: 'sid' })
  const ctx = createTestContext('http://localhost/')
  await middleware(ctx, async () => {
    const setSession = ctx.state['setSession'] as (data: Record<string, unknown>) => Promise<void>
    await setSession({ n: 1 })
    return new Response()
  })
  assertEquals(ctx.responseHeadersMap['Set-Cookie']?.startsWith('sid='), true)
})

Deno.test('session custom cookie options are reflected in Set-Cookie', async () => {
  const middleware = Middleware.Mware.session({
    cookieSecret: testSecret,
    path: '/api',
    maxAge: 60,
    sameSite: 'Strict',
    httpOnly: false,
    cookieName: 'sid'
  })
  const ctx = createTestContext('http://localhost/')
  await middleware(ctx, async () => {
    const setSession = ctx.state['setSession'] as (data: Record<string, unknown>) => Promise<void>
    await setSession({ ok: true })
    return new Response()
  })
  const setCookie = ctx.responseHeadersMap['Set-Cookie'] ?? ''
  assertEquals(setCookie.startsWith('sid='), true)
  assertEquals(setCookie.includes('Path=/api'), true)
  assertEquals(setCookie.includes('Max-Age=60'), true)
  assertEquals(setCookie.includes('SameSite=Strict'), true)
  assertEquals(setCookie.includes('HttpOnly'), false)
})

Deno.test('session default cookie options include SameSite and HttpOnly', async () => {
  const middleware = Middleware.Mware.session({ cookieSecret: testSecret })
  const ctx = createTestContext('http://localhost/')
  await middleware(ctx, async () => {
    const setSession = ctx.state['setSession'] as (data: Record<string, unknown>) => Promise<void>
    await setSession({ ok: true })
    return new Response()
  })
  const setCookie = ctx.responseHeadersMap['Set-Cookie'] ?? ''
  assertEquals(setCookie.includes('SameSite=Lax'), true)
  assertEquals(setCookie.includes('HttpOnly'), true)
  assertEquals(setCookie.includes('Path=/'), true)
})

Deno.test('session invalid or malformed cookie yields null', async () => {
  const middleware = Middleware.Mware.session({ cookieSecret: testSecret })
  const ctx = createTestContext('http://localhost/', {
    headers: new Headers({ Cookie: 'session=not-valid-signed-format' })
  })
  const next = async (): Promise<Response> => new Response()
  await middleware(ctx, next)
  assertEquals(ctx.state['session'], null)
})

Deno.test('session setSession sets Set-Cookie and next receives response', async () => {
  const middleware = Middleware.Mware.session({ cookieSecret: testSecret })
  const ctx = createTestContext('http://localhost/')
  const next = async (): Promise<Response> => {
    const setSession = ctx.state['setSession'] as (data: Record<string, unknown>) => Promise<void>
    await setSession({ x: 1 })
    return new Response('ok')
  }
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(await res.text(), 'ok')
  }
  assertEquals(ctx.responseHeadersMap['Set-Cookie']?.includes('session='), true)
  assertEquals(ctx.responseHeadersMap['Set-Cookie']?.includes('Path=/'), true)
})

Deno.test('session throws when cookieSecret empty string', () => {
  let thrown = false
  try {
    Middleware.Mware.session({ cookieSecret: '' })
  } catch (e) {
    thrown = true
    assertEquals((e as Error).message.includes('cookieSecret'), true)
  }
  assertEquals(thrown, true)
})

Deno.test('session throws when cookieSecret missing', () => {
  let thrown = false
  try {
    Middleware.Mware.session({} as { cookieSecret: string })
  } catch (e) {
    thrown = true
    assertEquals((e as Error).message.includes('cookieSecret'), true)
  }
  assertEquals(thrown, true)
})

Deno.test('session with cookieSecret round-trip encode decode', async () => {
  const secret = 'test-secret-min-32-chars-long'
  const middleware = Middleware.Mware.session({ cookieSecret: secret })
  const ctx = createTestContext('http://localhost/')
  await middleware(ctx, async () => {
    const setSession = ctx.state['setSession'] as (data: Record<string, unknown>) => Promise<void>
    await setSession({ userId: 'u1', role: 'admin' })
    return new Response()
  })
  const setCookie = ctx.responseHeadersMap['Set-Cookie']
  assertEquals(setCookie !== undefined, true)
  const valueMatch = setCookie?.match(/session=([^;]+)/)
  assertEquals(valueMatch !== null, true)
  assertEquals((valueMatch?.[1] ?? '').includes('%') || (valueMatch?.[1] ?? '').includes('.'), true)
  const ctx2 = createTestContext('http://localhost/', {
    headers: new Headers({ Cookie: `session=${valueMatch?.[1] ?? ''}` })
  })
  await middleware(ctx2, async () => new Response())
  const session = ctx2.state['session'] as Record<string, unknown>
  assertEquals(session?.['userId'], 'u1')
  assertEquals(session?.['role'], 'admin')
})

Deno.test('session with cookieSecret tampered payload yields null', async () => {
  const secret = 'test-secret-min-32-chars-long'
  const middleware = Middleware.Mware.session({ cookieSecret: secret })
  const ctx = createTestContext('http://localhost/')
  await middleware(ctx, async () => {
    const setSession = ctx.state['setSession'] as (data: Record<string, unknown>) => Promise<void>
    await setSession({ userId: 'u1' })
    return new Response()
  })
  const setCookie = ctx.responseHeadersMap['Set-Cookie']
  const valueMatch = setCookie?.match(/session=([^;]+)/)
  const value = valueMatch?.[1] ?? ''
  const decoded = decodeURIComponent(value)
  const [payloadB64, sigB64] = decoded.split('.')
  const badPayload = (payloadB64 ?? '').slice(0, -2) + 'XX'
  const badCookie = encodeURIComponent(badPayload + '.' + (sigB64 ?? ''))
  const ctx2 = createTestContext('http://localhost/', {
    headers: new Headers({ Cookie: `session=${badCookie}` })
  })
  await middleware(ctx2, async () => new Response())
  assertEquals(ctx2.state['session'], null)
})

Deno.test('session with cookieSecret valid signed cookie decodes', async () => {
  const secret = 'test-secret-min-32-chars-long'
  const middleware = Middleware.Mware.session({ cookieSecret: secret })
  const ctx = createTestContext('http://localhost/')
  await middleware(ctx, async () => {
    const setSession = ctx.state['setSession'] as (data: Record<string, unknown>) => Promise<void>
    await setSession({ foo: 'bar' })
    return new Response()
  })
  const setCookie = ctx.responseHeadersMap['Set-Cookie']
  const valueMatch = setCookie?.match(/session=([^;]+)/)
  const ctx2 = createTestContext('http://localhost/', {
    headers: new Headers({ Cookie: `session=${valueMatch?.[1] ?? ''}` })
  })
  await middleware(ctx2, async () => new Response())
  assertEquals((ctx2.state['session'] as Record<string, unknown>)?.['foo'], 'bar')
})

Deno.test('session with cookieSecret wrong secret yields null', async () => {
  const middleware = Middleware.Mware.session({ cookieSecret: 'secret-a-min-32-chars-long!!!!' })
  const ctx = createTestContext('http://localhost/')
  await middleware(ctx, async () => {
    const setSession = ctx.state['setSession'] as (data: Record<string, unknown>) => Promise<void>
    await setSession({ id: 1 })
    return new Response()
  })
  const setCookie = ctx.responseHeadersMap['Set-Cookie']
  const valueMatch = setCookie?.match(/session=([^;]+)/)
  const cookieValue = valueMatch?.[1] ?? ''
  const middlewareB = Middleware.Mware.session({
    cookieSecret: 'secret-b-different-32-chars!!!!!'
  })
  const ctx2 = createTestContext('http://localhost/', {
    headers: new Headers({ Cookie: `session=${cookieValue}` })
  })
  await middlewareB(ctx2, async () => new Response())
  assertEquals(ctx2.state['session'], null)
})

Deno.test('session without cookie yields session null', async () => {
  const middleware = Middleware.Mware.session({ cookieSecret: testSecret })
  const ctx = createTestContext('http://localhost/')
  const next = async (): Promise<Response> => new Response()
  await middleware(ctx, next)
  assertEquals(ctx.state['session'], null)
})
