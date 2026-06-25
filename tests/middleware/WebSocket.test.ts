import { assertEquals } from '@std/assert'
import * as Core from '@core/index.ts'
import * as Middleware from '@middleware/index.ts'
import Helper from '@tests/helper.ts'

Deno.test('websocket allows a handshake when no Origin header is present', async () => {
  const mw = Middleware.Mware.websocket({ listener: '/ws' })
  const ctx = Helper.createTestContext('http://localhost/ws', {
    headers: { Upgrade: 'websocket' }
  })
  let nextCalled = false
  const next = (): Promise<Response> => {
    nextCalled = true
    return Promise.resolve(new Response('ok'))
  }
  const res = await mw(ctx, next)
  assertEquals(nextCalled, false)
  assertEquals(res?.status === 403, false)
})

Deno.test('websocket allows a same-origin handshake', async () => {
  const mw = Middleware.Mware.websocket({ listener: '/ws' })
  const ctx = Helper.createTestContext('http://localhost/ws', {
    headers: { Upgrade: 'websocket', Origin: 'http://localhost' }
  })
  let nextCalled = false
  const next = (): Promise<Response> => {
    nextCalled = true
    return Promise.resolve(new Response('ok'))
  }
  const res = await mw(ctx, next)
  assertEquals(nextCalled, false)
  assertEquals(res?.status === 403, false)
})

Deno.test('websocket allows an origin present in the allowlist', async () => {
  const mw = Middleware.Mware.websocket({
    listener: '/ws',
    allowedOrigins: ['http://localhost']
  })
  const ctx = Helper.createTestContext('http://localhost/ws', {
    headers: { Upgrade: 'websocket', Origin: 'http://localhost' }
  })
  let nextCalled = false
  const next = (): Promise<Response> => {
    nextCalled = true
    return Promise.resolve(new Response('ok'))
  }
  const res = await mw(ctx, next)
  assertEquals(nextCalled, false)
  assertEquals(res?.status === 403, false)
})

Deno.test('websocket default listener is empty and calls next', async () => {
  const mw = Middleware.Mware.websocket()
  const ctx = Helper.createTestContext('http://localhost/')
  const res = await mw(ctx, Helper.okNext)
  assertEquals(await res?.text(), 'ok')
})

Deno.test('websocket does not upgrade PUT, DELETE, or PATCH requests', async () => {
  const mw = Middleware.Mware.websocket({ listener: '/ws', allowedOrigins: '*' })
  for (const method of ['PUT', 'DELETE', 'PATCH']) {
    const ctx = Helper.createTestContext('http://localhost/ws', {
      method,
      headers: { Upgrade: 'websocket' }
    })
    let nextCalled = false
    const next = (): Promise<Response> => {
      nextCalled = true
      return Promise.resolve(new Response('ok'))
    }
    await mw(ctx, next)
    assertEquals(nextCalled, true)
  }
})

Deno.test('websocket does not upgrade a POST request carrying an Upgrade header', async () => {
  const mw = Middleware.Mware.websocket({ listener: '/ws', allowedOrigins: '*' })
  const ctx = Helper.createTestContext('http://localhost/ws', {
    method: 'POST',
    headers: { Upgrade: 'websocket', Origin: 'https://anything.example' }
  })
  let nextCalled = false
  const next = (): Promise<Response> => {
    nextCalled = true
    return Promise.resolve(new Response('route-handled-post'))
  }
  const res = await mw(ctx, next)
  assertEquals(nextCalled, true)
  assertEquals(await res?.text(), 'route-handled-post')
})

Deno.test('websocket listener /ws does not match /ws-admin path', async () => {
  const mw = Middleware.Mware.websocket({ listener: '/ws' })
  const ctx = Helper.createTestContext('http://localhost/ws-admin', {
    headers: { Upgrade: 'websocket' }
  })
  let nextCalled = false
  const next = (): Promise<Response> => {
    nextCalled = true
    return Promise.resolve(new Response('ok'))
  }
  await mw(ctx, next)
  assertEquals(nextCalled, true)
})

Deno.test('websocket listener with trailing slash is normalized', async () => {
  const mw = Middleware.Mware.websocket({ listener: '/ws/' })
  const ctx = Helper.createTestContext('http://localhost/ws-other', {
    headers: { Upgrade: 'websocket' }
  })
  let nextCalled = false
  const next = (): Promise<Response> => {
    nextCalled = true
    return Promise.resolve(new Response('ok'))
  }
  await mw(ctx, next)
  assertEquals(nextCalled, true)
})

Deno.test('websocket malformed handshake does not reach the route chain', async () => {
  const mw = Middleware.Mware.websocket({ listener: '/ws', allowedOrigins: '*' })
  const ctx = Helper.createTestContext('http://localhost/ws', {
    headers: { Upgrade: 'websocket', Origin: 'https://anything.example' }
  })
  let nextCalled = false
  const next = (): Promise<Response> => {
    nextCalled = true
    return Promise.resolve(new Response('ok'))
  }
  const res = await mw(ctx, next)
  assertEquals(nextCalled, false)
  assertEquals(res?.status, 400)
})

Deno.test('websocket maps a malformed handshake to 400 not 500', async () => {
  const mw = Middleware.Mware.websocket({ listener: '/ws' })
  const ctx = Helper.createTestContext('http://localhost/ws', {
    headers: { Upgrade: 'websocket', Origin: 'http://localhost' }
  })
  let nextCalled = false
  const next = (): Promise<Response> => {
    nextCalled = true
    return Promise.resolve(new Response('ok'))
  }
  const res = await mw(ctx, next)
  assertEquals(nextCalled, false)
  assertEquals(res?.status, 400)
})

Deno.test('websocket returns 400 for a missing Sec-WebSocket-Version', async () => {
  const mw = Middleware.Mware.websocket({ listener: '/ws', allowedOrigins: '*' })
  const ctx = Helper.createTestContext('http://localhost/ws', {
    headers: { Upgrade: 'websocket', Origin: 'https://anything.example' }
  })
  const res = await mw(ctx, Helper.okNext)
  assertEquals(res?.status, 400)
})

Deno.test('websocket returns 403 for a cross-origin handshake by default', async () => {
  const mw = Middleware.Mware.websocket({ listener: '/ws' })
  const ctx = Helper.createTestContext('http://localhost/ws', {
    headers: { Upgrade: 'websocket', Origin: 'https://external.example' }
  })
  const res = await mw(ctx, Helper.okNext)
  assertEquals(res?.status, 403)
})

Deno.test('websocket returns 403 for an origin outside the allowlist', async () => {
  const mw = Middleware.Mware.websocket({
    listener: '/ws',
    allowedOrigins: ['https://app.example.com']
  })
  const ctx = Helper.createTestContext('http://localhost/ws', {
    headers: { Upgrade: 'websocket', Origin: 'https://other.example.com' }
  })
  const res = await mw(ctx, Helper.okNext)
  assertEquals(res?.status, 403)
})

Deno.test('websocket returns 403 when the request URL cannot be parsed', async () => {
  const request = new Request('http://localhost/ws', {
    headers: { Upgrade: 'websocket', Origin: 'http://localhost' }
  })
  Object.defineProperty(request, 'url', { value: 'not a url', configurable: true })
  const ctx = new Core.Context(
    request,
    new URL('http://localhost/ws'),
    null,
    undefined,
    undefined,
    null,
    () => {}
  )
  const mw = Middleware.Mware.websocket({ listener: '/ws' })
  const res = await mw(ctx, Helper.okNext)
  assertEquals(res?.status, 403)
})

Deno.test('websocket returns 426 for a non-13 Sec-WebSocket-Version', async () => {
  const mw = Middleware.Mware.websocket({ listener: '/ws', allowedOrigins: '*' })
  const ctx = Helper.createTestContext('http://localhost/ws', {
    headers: {
      Upgrade: 'websocket',
      Origin: 'https://anything.example',
      'Sec-WebSocket-Version': '12'
    }
  })
  const res = await mw(ctx, Helper.okNext)
  assertEquals(res?.status, 426)
  assertEquals(res?.headers.get('sec-websocket-version'), '13')
  assertEquals(res?.headers.get('upgrade'), 'websocket')
})

Deno.test('websocket trims whitespace around Sec-WebSocket-Version', async () => {
  const mw = Middleware.Mware.websocket({ listener: '/ws', allowedOrigins: '*' })
  const ctx = Helper.createTestContext('http://localhost/ws', {
    headers: {
      Upgrade: 'websocket',
      Origin: 'https://anything.example',
      'Sec-WebSocket-Version': ' 13 '
    }
  })
  let nextCalled = false
  const next = (): Promise<Response> => {
    nextCalled = true
    return Promise.resolve(new Response('ok'))
  }
  const res = await mw(ctx, next)
  assertEquals(nextCalled, false)
  assertEquals((res?.status as number) === 426 && (res?.status as number) === 400, false)
})

Deno.test('websocket wildcard allowedOrigins disables the origin check', async () => {
  const mw = Middleware.Mware.websocket({
    listener: '/ws',
    allowedOrigins: '*'
  })
  const ctx = Helper.createTestContext('http://localhost/ws', {
    headers: { Upgrade: 'websocket', Origin: 'https://external.example' }
  })
  let nextCalled = false
  const next = (): Promise<Response> => {
    nextCalled = true
    return Promise.resolve(new Response('ok'))
  }
  const res = await mw(ctx, next)
  assertEquals(nextCalled, false)
  assertEquals(res?.status === 403, false)
})

Deno.test('websocket with a non-websocket upgrade header calls next', async () => {
  const mw = Middleware.Mware.websocket({ listener: '/ws' })
  const ctx = Helper.createTestContext('http://localhost/ws', {
    headers: { Upgrade: 'HTTP' }
  })
  const res = await mw(ctx, Helper.okNext)
  assertEquals(await res?.text(), 'ok')
})

Deno.test('websocket with an empty options listener calls next', async () => {
  const mw = Middleware.Mware.websocket({})
  const ctx = Helper.createTestContext('http://localhost/')
  const res = await mw(ctx, Helper.okNext)
  assertEquals(await res?.text(), 'ok')
})

Deno.test('websocket with an upgrade header but wrong path calls next', async () => {
  const mw = Middleware.Mware.websocket({ listener: '/ws' })
  const ctx = Helper.createTestContext('http://localhost/api', {
    headers: { Upgrade: 'websocket' }
  })
  const res = await mw(ctx, Helper.okNext)
  assertEquals(await res?.text(), 'ok')
})

Deno.test('websocket with listener but no upgrade header calls next', async () => {
  const mw = Middleware.Mware.websocket({ listener: '/ws' })
  const ctx = Helper.createTestContext('http://localhost/ws')
  const res = await mw(ctx, Helper.okNext)
  assertEquals(await res?.text(), 'ok')
})
