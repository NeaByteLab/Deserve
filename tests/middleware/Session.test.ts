import { assertEquals } from '@std/assert'
import { Handler } from '@core/Handler.ts'
import * as Core from '@core/index.ts'
import * as Middleware from '@middleware/index.ts'

function createTestContext(url = 'http://localhost/', requestInit?: RequestInit): Core.Context {
  const request = new Request(url, requestInit)
  return new Core.Context(request, new URL(url), {})
}

function createCapturingContext(
  events: Array<{ kind: string; metadata: Record<string, unknown> }>,
  requestInit?: RequestInit
): Core.Context {
  const url = 'http://localhost/'
  const request = new Request(url, requestInit)
  return new Core.Context(
    request,
    new URL(url),
    {},
    undefined,
    undefined,
    undefined,
    (event) => events.push(event as { kind: string; metadata: Record<string, unknown> })
  )
}

const testSecret = '*****************************!!!'

Deno.test('session URL-encoded cookie value is decoded before parsing', async () => {
  const secret = testSecret
  const middleware = Middleware.Mware.session({ cookieSecret: secret })
  const ctx = createTestContext('http://localhost/')
  await middleware(ctx, async () => {
    const setSession = ctx.getState(Handler.stateKeys.setSession) as (
      data: Record<string, unknown>
    ) => Promise<void>
    await setSession({ key: 'value' })
    return new Response()
  })
  const setCookie = ctx[Core.InternalContext].responseCookies.at(-1)
  const valueMatch = setCookie?.match(/session=([^;]+)/)
  const rawValue = valueMatch?.[1] ?? ''
  const encoded = encodeURIComponent(decodeURIComponent(rawValue))
  const ctx2 = createTestContext('http://localhost/', {
    headers: new Headers({ Cookie: `session=${encoded}` })
  })
  await middleware(ctx2, async () => new Response())
  const session = ctx2.getState(Handler.stateKeys.session) as Record<string, unknown>
  assertEquals(session?.['key'], 'value')
})

Deno.test('session clearSession sets Max-Age=0 and path', async () => {
  const middleware = Middleware.Mware.session({ cookieSecret: testSecret, path: '/api' })
  const ctx = createTestContext('http://localhost/')
  await middleware(ctx, async () => {
    ;(ctx.getState(Handler.stateKeys.clearSession) as () => void)()
    return new Response()
  })
  const setCookie = ctx[Core.InternalContext].responseCookies.at(-1) ?? ''
  assertEquals(setCookie.includes('Max-Age=0'), true)
  assertEquals(setCookie.includes('Path=/api'), true)
})

Deno.test('session cookie value with dot at end yields null', async () => {
  const middleware = Middleware.Mware.session({ cookieSecret: testSecret })
  const ctx = createTestContext('http://localhost/', {
    headers: new Headers({ Cookie: 'session=payload.' })
  })
  const next = async (): Promise<Response> => new Response()
  await middleware(ctx, next)
  assertEquals(ctx.getState(Handler.stateKeys.session), null)
})

Deno.test('session cookie value with dot at position 0 yields null', async () => {
  const middleware = Middleware.Mware.session({ cookieSecret: testSecret })
  const ctx = createTestContext('http://localhost/', {
    headers: new Headers({ Cookie: 'session=.signature' })
  })
  const next = async (): Promise<Response> => new Response()
  await middleware(ctx, next)
  assertEquals(ctx.getState(Handler.stateKeys.session), null)
})

Deno.test('session cookie value with no dot yields null', async () => {
  const middleware = Middleware.Mware.session({ cookieSecret: testSecret })
  const ctx = createTestContext('http://localhost/', {
    headers: new Headers({ Cookie: 'session=nodothere' })
  })
  const next = async (): Promise<Response> => new Response()
  await middleware(ctx, next)
  assertEquals(ctx.getState(Handler.stateKeys.session), null)
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
    const setSession = ctx.getState(Handler.stateKeys.setSession) as (
      data: Record<string, unknown>
    ) => Promise<void>
    await setSession({ ok: true })
    return new Response()
  })
  const setCookie = ctx[Core.InternalContext].responseCookies.at(-1) ?? ''
  assertEquals(setCookie.startsWith('sid='), true)
  assertEquals(setCookie.includes('Path=/api'), true)
  assertEquals(setCookie.includes('Max-Age=60'), true)
  assertEquals(setCookie.includes('SameSite=Strict'), true)
  assertEquals(setCookie.includes('HttpOnly'), false)
})

Deno.test('session custom cookieName used in Set-Cookie', async () => {
  const middleware = Middleware.Mware.session({ cookieSecret: testSecret, cookieName: 'sid' })
  const ctx = createTestContext('http://localhost/')
  await middleware(ctx, async () => {
    const setSession = ctx.getState(Handler.stateKeys.setSession) as (
      data: Record<string, unknown>
    ) => Promise<void>
    await setSession({ n: 1 })
    return new Response()
  })
  assertEquals(ctx[Core.InternalContext].responseCookies.at(-1)?.startsWith('sid='), true)
})

Deno.test('session default cookie options include SameSite and HttpOnly', async () => {
  const middleware = Middleware.Mware.session({ cookieSecret: testSecret })
  const ctx = createTestContext('http://localhost/')
  await middleware(ctx, async () => {
    const setSession = ctx.getState(Handler.stateKeys.setSession) as (
      data: Record<string, unknown>
    ) => Promise<void>
    await setSession({ ok: true })
    return new Response()
  })
  const setCookie = ctx[Core.InternalContext].responseCookies.at(-1) ?? ''
  assertEquals(setCookie.includes('SameSite=Lax'), true)
  assertEquals(setCookie.includes('HttpOnly'), true)
  assertEquals(setCookie.includes('Secure'), true)
  assertEquals(setCookie.includes('Path=/'), true)
})

Deno.test('session does not emit session:invalid for a valid cookie', async () => {
  const events: Array<{ kind: string; metadata: Record<string, unknown> }> = []
  const minter = Middleware.Mware.session({ cookieSecret: testSecret })
  const minted = createTestContext('http://localhost/')
  await minter(minted, async () => {
    const setSession = minted.getState(Handler.stateKeys.setSession) as (
      data: Record<string, unknown>
    ) => Promise<void>
    await setSession({ user: 'a' })
    return new Response()
  })
  const setCookie = minted[Core.InternalContext].responseCookies.at(-1) ?? ''
  const cookieValue = setCookie.match(/session=([^;]+)/)?.[1] ?? ''
  const reader = Middleware.Mware.session({ cookieSecret: testSecret })
  const ctx = createCapturingContext(events, {
    headers: new Headers({ Cookie: `session=${cookieValue}` })
  })
  await reader(ctx, async () => new Response())
  assertEquals((ctx.getState(Handler.stateKeys.session) as Record<string, unknown>)?.['user'], 'a')
  assertEquals(events.filter((e) => e.kind === 'session:invalid').length, 0)
})

Deno.test('session does not emit session:invalid when no cookie is present', async () => {
  const events: Array<{ kind: string; metadata: Record<string, unknown> }> = []
  const middleware = Middleware.Mware.session({ cookieSecret: testSecret })
  const ctx = createCapturingContext(events)
  await middleware(ctx, async () => new Response())
  assertEquals(events.filter((e) => e.kind === 'session:invalid').length, 0)
})

Deno.test('session emits session:invalid with reason expired for a stale cookie', async () => {
  const events: Array<{ kind: string; metadata: Record<string, unknown> }> = []
  const minter = Middleware.Mware.session({ cookieSecret: testSecret })
  const minted = createTestContext('http://localhost/')
  await minter(minted, async () => {
    const setSession = minted.getState(Handler.stateKeys.setSession) as (
      data: Record<string, unknown>
    ) => Promise<void>
    await setSession({ user: 'a' })
    return new Response()
  })
  const setCookie = minted[Core.InternalContext].responseCookies.at(-1) ?? ''
  const cookieValue = setCookie.match(/session=([^;]+)/)?.[1] ?? ''
  await new Promise((r) => setTimeout(r, 2200))
  const reader = Middleware.Mware.session({ cookieSecret: testSecret, maxAge: 1 })
  const ctx = createCapturingContext(events, {
    headers: new Headers({ Cookie: `session=${cookieValue}` })
  })
  await reader(ctx, async () => new Response())
  assertEquals(ctx.getState(Handler.stateKeys.session), null)
  const invalid = events.filter((e) => e.kind === 'session:invalid')
  assertEquals(invalid.length, 1)
  assertEquals(invalid[0]?.metadata['reason'], 'expired')
})

Deno.test('session emits session:invalid with reason tampered for a forged signature', async () => {
  const events: Array<{ kind: string; metadata: Record<string, unknown> }> = []
  const middleware = Middleware.Mware.session({ cookieSecret: testSecret })
  const ctx = createCapturingContext(events, {
    headers: new Headers({ Cookie: 'session=eyJ1c2VyIjoiYSJ9.dGFtcGVyZWRzaWduYXR1cmU' })
  })
  await middleware(ctx, async () => new Response())
  assertEquals(ctx.getState(Handler.stateKeys.session), null)
  const invalid = events.filter((e) => e.kind === 'session:invalid')
  assertEquals(invalid.length, 1)
  assertEquals(invalid[0]?.metadata['reason'], 'tampered')
  assertEquals(invalid[0]?.metadata['cookieName'], 'session')
})

Deno.test('session invalid or malformed cookie yields null', async () => {
  const middleware = Middleware.Mware.session({ cookieSecret: testSecret })
  const ctx = createTestContext('http://localhost/', {
    headers: new Headers({ Cookie: 'session=not-valid-signed-format' })
  })
  const next = async (): Promise<Response> => new Response()
  await middleware(ctx, next)
  assertEquals(ctx.getState(Handler.stateKeys.session), null)
})

Deno.test('session rejects Infinity maxAge', () => {
  let thrown = false
  try {
    Middleware.Mware.session({ cookieSecret: testSecret, maxAge: Infinity })
  } catch (e) {
    thrown = true
    assertEquals(e instanceof Deno.errors.InvalidData, true)
  }
  assertEquals(thrown, true)
})

Deno.test('session rejects SameSite=None without secure', () => {
  let thrown = false
  try {
    Middleware.Mware.session({
      cookieSecret: testSecret,
      sameSite: 'None',
      secure: false
    })
  } catch (e) {
    thrown = true
    assertEquals((e as Error).message.includes('SameSite=None'), true)
  }
  assertEquals(thrown, true)
})

Deno.test('session rejects empty path', () => {
  let thrown = false
  try {
    Middleware.Mware.session({ cookieSecret: testSecret, path: '' })
  } catch (e) {
    thrown = true
    assertEquals(e instanceof Deno.errors.InvalidData, true)
  }
  assertEquals(thrown, true)
})

Deno.test('session rejects negative maxAge', () => {
  let thrown = false
  try {
    Middleware.Mware.session({ cookieSecret: testSecret, maxAge: -1 })
  } catch (e) {
    thrown = true
    assertEquals(e instanceof Deno.errors.InvalidData, true)
  }
  assertEquals(thrown, true)
})

Deno.test('session rejects zero maxAge', () => {
  let thrown = false
  try {
    Middleware.Mware.session({ cookieSecret: testSecret, maxAge: 0 })
  } catch (e) {
    thrown = true
    assertEquals(e instanceof Deno.errors.InvalidData, true)
  }
  assertEquals(thrown, true)
})

Deno.test('session setSession sets Set-Cookie and next receives response', async () => {
  const middleware = Middleware.Mware.session({ cookieSecret: testSecret })
  const ctx = createTestContext('http://localhost/')
  const next = async (): Promise<Response> => {
    const setSession = ctx.getState(Handler.stateKeys.setSession) as (
      data: Record<string, unknown>
    ) => Promise<void>
    await setSession({ x: 1 })
    return new Response('ok')
  }
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(await res.text(), 'ok')
  }
  assertEquals(ctx[Core.InternalContext].responseCookies.at(-1)?.includes('session='), true)
  assertEquals(ctx[Core.InternalContext].responseCookies.at(-1)?.includes('Path=/'), true)
})

Deno.test('session throws Deno.errors.InvalidData for empty cookieSecret', () => {
  let thrown = false
  try {
    Middleware.Mware.session({ cookieSecret: '' })
  } catch (e) {
    thrown = true
    assertEquals(e instanceof Deno.errors.InvalidData, true)
  }
  assertEquals(thrown, true)
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

Deno.test('session throws when cookieSecret shorter than 32 characters', () => {
  let thrown = false
  try {
    Middleware.Mware.session({ cookieSecret: '*******************************' })
  } catch (e) {
    thrown = true
    assertEquals(e instanceof Deno.errors.InvalidData, true)
    assertEquals((e as Error).message.includes('32'), true)
  }
  assertEquals(thrown, true)
})

Deno.test('session token does not expose internal timestamp to consumer', async () => {
  const middleware = Middleware.Mware.session({ cookieSecret: testSecret })
  const ctx1 = createTestContext('http://localhost/')
  await middleware(ctx1, async () => {
    const set = ctx1.getState(Handler.stateKeys.setSession) as (
      d: Record<string, unknown>
    ) => Promise<void>
    await set({ name: 'test' })
    return new Response()
  })
  const cookie =
    (ctx1[Core.InternalContext].responseCookies.at(-1) ?? '').match(/session=([^;]+)/)?.[1] ?? ''
  const ctx2 = createTestContext('http://localhost/', {
    headers: new Headers({ Cookie: `session=${cookie}` })
  })
  const next = (): Promise<Response> => Promise.resolve(new Response())
  await middleware(ctx2, next)
  const session = ctx2.getState(Handler.stateKeys.session) as Record<string, unknown>
  assertEquals(session?.['name'], 'test')
  assertEquals(session?.['_iat'], undefined)
})

Deno.test('session token rejected after server-side expiry', async () => {
  const middleware = Middleware.Mware.session({ cookieSecret: testSecret, maxAge: 1 })
  const ctx1 = createTestContext('http://localhost/')
  await middleware(ctx1, async () => {
    const set = ctx1.getState(Handler.stateKeys.setSession) as (
      d: Record<string, unknown>
    ) => Promise<void>
    await set({ userId: 'admin' })
    return new Response()
  })
  const cookie =
    (ctx1[Core.InternalContext].responseCookies.at(-1) ?? '').match(/session=([^;]+)/)?.[1] ?? ''
  await new Promise((r) => setTimeout(r, 2500))
  const ctx2 = createTestContext('http://localhost/', {
    headers: new Headers({ Cookie: `session=${cookie}` })
  })
  const next = (): Promise<Response> => Promise.resolve(new Response())
  await middleware(ctx2, next)
  assertEquals(ctx2.getState(Handler.stateKeys.session), null)
})

Deno.test('session token with valid _iat decodes within maxAge', async () => {
  const middleware = Middleware.Mware.session({ cookieSecret: testSecret, maxAge: 3600 })
  const ctx1 = createTestContext('http://localhost/')
  await middleware(ctx1, async () => {
    const set = ctx1.getState(Handler.stateKeys.setSession) as (
      d: Record<string, unknown>
    ) => Promise<void>
    await set({ userId: 'u1', role: 'admin' })
    return new Response()
  })
  const cookie =
    (ctx1[Core.InternalContext].responseCookies.at(-1) ?? '').match(/session=([^;]+)/)?.[1] ?? ''
  const ctx2 = createTestContext('http://localhost/', {
    headers: new Headers({ Cookie: `session=${cookie}` })
  })
  const next = (): Promise<Response> => Promise.resolve(new Response())
  await middleware(ctx2, next)
  const session = ctx2.getState(Handler.stateKeys.session) as Record<string, unknown>
  assertEquals(session?.['userId'], 'u1')
  assertEquals(session?.['role'], 'admin')
})

Deno.test('session with cookieSecret round-trip encode decode', async () => {
  const secret = '*****************************!!!'
  const middleware = Middleware.Mware.session({ cookieSecret: secret })
  const ctx = createTestContext('http://localhost/')
  await middleware(ctx, async () => {
    const setSession = ctx.getState(Handler.stateKeys.setSession) as (
      data: Record<string, unknown>
    ) => Promise<void>
    await setSession({ userId: 'u1', role: 'admin' })
    return new Response()
  })
  const setCookie = ctx[Core.InternalContext].responseCookies.at(-1)
  assertEquals(setCookie !== undefined, true)
  const valueMatch = setCookie?.match(/session=([^;]+)/)
  assertEquals(valueMatch !== null, true)
  assertEquals((valueMatch?.[1] ?? '').includes('%') || (valueMatch?.[1] ?? '').includes('.'), true)
  const ctx2 = createTestContext('http://localhost/', {
    headers: new Headers({ Cookie: `session=${valueMatch?.[1] ?? ''}` })
  })
  await middleware(ctx2, async () => new Response())
  const session = ctx2.getState(Handler.stateKeys.session) as Record<string, unknown>
  assertEquals(session?.['userId'], 'u1')
  assertEquals(session?.['role'], 'admin')
})

Deno.test('session with cookieSecret tampered payload yields null', async () => {
  const secret = '*****************************!!!'
  const middleware = Middleware.Mware.session({ cookieSecret: secret })
  const ctx = createTestContext('http://localhost/')
  await middleware(ctx, async () => {
    const setSession = ctx.getState(Handler.stateKeys.setSession) as (
      data: Record<string, unknown>
    ) => Promise<void>
    await setSession({ userId: 'u1' })
    return new Response()
  })
  const setCookie = ctx[Core.InternalContext].responseCookies.at(-1)
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
  assertEquals(ctx2.getState(Handler.stateKeys.session), null)
})

Deno.test('session with cookieSecret valid signed cookie decodes', async () => {
  const secret = '*****************************!!!'
  const middleware = Middleware.Mware.session({ cookieSecret: secret })
  const ctx = createTestContext('http://localhost/')
  await middleware(ctx, async () => {
    const setSession = ctx.getState(Handler.stateKeys.setSession) as (
      data: Record<string, unknown>
    ) => Promise<void>
    await setSession({ foo: 'bar' })
    return new Response()
  })
  const setCookie = ctx[Core.InternalContext].responseCookies.at(-1)
  const valueMatch = setCookie?.match(/session=([^;]+)/)
  const ctx2 = createTestContext('http://localhost/', {
    headers: new Headers({ Cookie: `session=${valueMatch?.[1] ?? ''}` })
  })
  await middleware(ctx2, async () => new Response())
  assertEquals(
    (ctx2.getState(Handler.stateKeys.session) as Record<string, unknown>)?.['foo'],
    'bar'
  )
})

Deno.test('session with cookieSecret wrong secret yields null', async () => {
  const middleware = Middleware.Mware.session({ cookieSecret: '**************************!!!!!!' })
  const ctx = createTestContext('http://localhost/')
  await middleware(ctx, async () => {
    const setSession = ctx.getState(Handler.stateKeys.setSession) as (
      data: Record<string, unknown>
    ) => Promise<void>
    await setSession({ id: 1 })
    return new Response()
  })
  const setCookie = ctx[Core.InternalContext].responseCookies.at(-1)
  const valueMatch = setCookie?.match(/session=([^;]+)/)
  const cookieValue = valueMatch?.[1] ?? ''
  const middlewareB = Middleware.Mware.session({
    cookieSecret: '***************************!!!!!'
  })
  const ctx2 = createTestContext('http://localhost/', {
    headers: new Headers({ Cookie: `session=${cookieValue}` })
  })
  await middlewareB(ctx2, async () => new Response())
  assertEquals(ctx2.getState(Handler.stateKeys.session), null)
})

Deno.test('session without cookie yields session null', async () => {
  const middleware = Middleware.Mware.session({ cookieSecret: testSecret })
  const ctx = createTestContext('http://localhost/')
  const next = async (): Promise<Response> => new Response()
  await middleware(ctx, next)
  assertEquals(ctx.getState(Handler.stateKeys.session), null)
})
