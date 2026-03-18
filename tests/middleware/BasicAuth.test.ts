import { assertEquals } from 'jsr:@std/assert'
import * as Core from '@core/index.ts'
import * as Middleware from '@middleware/index.ts'

function createTestContext(url = 'http://localhost/', requestInit?: RequestInit): Core.Context {
  const request = new Request(url, requestInit)
  return new Core.Context(request, new URL(url), {})
}

Deno.test('basicAuth always sets WWW-Authenticate header', async () => {
  const middleware = Middleware.Mware.basicAuth({
    users: [{ username: 'u', password: 'p' }]
  })
  const ctx = createTestContext('http://localhost/')
  const next = async (): Promise<Response> => new Response('ok')
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  assertEquals(ctx.responseHeadersMap['WWW-Authenticate'], 'Basic realm="Secure Area"')
})

Deno.test('basicAuth returns 401 when Authorization base64 is invalid', async () => {
  const middleware = Middleware.Mware.basicAuth({
    users: [{ username: 'u', password: 'p' }]
  })
  const ctx = createTestContext('http://localhost/', {
    headers: new Headers({ Authorization: 'Basic !!!!' })
  })
  const next = async (): Promise<Response> => new Response('ok')
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(res.status, 401)
  }
})

Deno.test('basicAuth returns 401 when credential has no colon', async () => {
  const middleware = Middleware.Mware.basicAuth({
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
  const middleware = Middleware.Mware.basicAuth({
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
  const middleware = Middleware.Mware.basicAuth({
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
    Middleware.Mware.basicAuth({ users: [] })
  } catch (e) {
    thrown = true
    assertEquals((e as Error).message.includes('users array cannot be empty'), true)
  }
  assertEquals(thrown, true)
})

Deno.test('basicAuth with valid credential calls next', async () => {
  const middleware = Middleware.Mware.basicAuth({
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
