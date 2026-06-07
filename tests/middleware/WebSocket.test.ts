import { assertEquals } from '@std/assert'
import * as Core from '@core/index.ts'
import * as Middleware from '@middleware/index.ts'

function createTestContext(url = 'http://localhost/', requestInit?: RequestInit): Core.Context {
  const request = new Request(url, requestInit)
  return new Core.Context(request, new URL(url), {})
}

Deno.test('websocket allows a same-origin handshake', async () => {
  const middleware = Middleware.Mware.websocket({ listener: '/ws' })
  const ctx = createTestContext('http://localhost/ws', {
    headers: new Headers({ Upgrade: 'websocket', Origin: 'http://localhost' })
  })
  let nextCalled = false
  const next = (): Promise<Response> => {
    nextCalled = true
    return Promise.resolve(new Response('ok'))
  }
  const res = await middleware(ctx, next)
  assertEquals(nextCalled, false)
  assertEquals(res?.status === 403, false)
})

Deno.test('websocket allows an origin present in the allowlist', async () => {
  const middleware = Middleware.Mware.websocket({
    listener: '/ws',
    allowedOrigins: ['http://localhost']
  })
  const ctx = createTestContext('http://localhost/ws', {
    headers: new Headers({ Upgrade: 'websocket', Origin: 'http://localhost' })
  })
  let nextCalled = false
  const next = (): Promise<Response> => {
    nextCalled = true
    return Promise.resolve(new Response('ok'))
  }
  const res = await middleware(ctx, next)
  assertEquals(nextCalled, false)
  assertEquals(res?.status === 403, false)
})

Deno.test('websocket allows handshake when no Origin header is present', async () => {
  const middleware = Middleware.Mware.websocket({ listener: '/ws' })
  const ctx = createTestContext('http://localhost/ws', {
    headers: new Headers({ Upgrade: 'websocket' })
  })
  let nextCalled = false
  const next = (): Promise<Response> => {
    nextCalled = true
    return Promise.resolve(new Response('ok'))
  }
  const res = await middleware(ctx, next)
  assertEquals(nextCalled, false)
  assertEquals(res?.status === 403, false)
})

Deno.test('websocket default listener is empty string and calls next', async () => {
  const middleware = Middleware.Mware.websocket()
  const ctx = createTestContext('http://localhost/')
  const next = async (): Promise<Response> => new Response('ok')
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(await res.text(), 'ok')
  }
})

Deno.test('websocket listener /ws does not match /ws-admin path', async () => {
  const middleware = Middleware.Mware.websocket({ listener: '/ws' })
  const ctx = createTestContext('http://localhost/ws-admin', {
    headers: new Headers({ Upgrade: 'websocket' })
  })
  let nextCalled = false
  const next = (): Promise<Response> => {
    nextCalled = true
    return Promise.resolve(new Response('ok'))
  }
  await middleware(ctx, next)
  assertEquals(nextCalled, true)
})

Deno.test('websocket listener with trailing slash normalized', async () => {
  const middleware = Middleware.Mware.websocket({ listener: '/ws/' })
  const ctx = createTestContext('http://localhost/ws-other', {
    headers: new Headers({ Upgrade: 'websocket' })
  })
  let nextCalled = false
  const next = (): Promise<Response> => {
    nextCalled = true
    return Promise.resolve(new Response('ok'))
  }
  await middleware(ctx, next)
  assertEquals(nextCalled, true)
})

Deno.test('websocket rejects cross-origin handshake by default', async () => {
  const middleware = Middleware.Mware.websocket({ listener: '/ws' })
  const ctx = createTestContext('http://localhost/ws', {
    headers: new Headers({ Upgrade: 'websocket', Origin: 'https://evil.com' })
  })
  const next = async (): Promise<Response> => new Response('ok')
  const res = await middleware(ctx, next)
  assertEquals(res?.status, 403)
})

Deno.test('websocket rejects origin not in allowlist', async () => {
  const middleware = Middleware.Mware.websocket({
    listener: '/ws',
    allowedOrigins: ['https://app.example.com']
  })
  const ctx = createTestContext('http://localhost/ws', {
    headers: new Headers({ Upgrade: 'websocket', Origin: 'https://other.example.com' })
  })
  const next = async (): Promise<Response> => new Response('ok')
  const res = await middleware(ctx, next)
  assertEquals(res?.status, 403)
})

Deno.test('websocket rejects substring-origin handshake by default', async () => {
  const middleware = Middleware.Mware.websocket({ listener: '/ws' })
  const ctx = createTestContext('http://localhost/ws', {
    headers: new Headers({ Upgrade: 'websocket', Origin: 'http://localhost.evil.com' })
  })
  const next = async (): Promise<Response> => new Response('ok')
  const res = await middleware(ctx, next)
  assertEquals(res?.status, 403)
})

Deno.test('websocket rejects the handshake when the request URL cannot be parsed', async () => {
  const request = new Request('http://localhost/ws', {
    headers: new Headers({ Upgrade: 'websocket', Origin: 'http://localhost' })
  })
  Object.defineProperty(request, 'url', { value: 'not a url', configurable: true })
  const ctx = new Core.Context(request, new URL('http://localhost/ws'), {})
  const middleware = Middleware.Mware.websocket({ listener: '/ws' })
  const next = async (): Promise<Response> => new Response('ok')
  const res = await middleware(ctx, next)
  assertEquals(res?.status, 403)
})

Deno.test('websocket wildcard allowedOrigins disables the origin check', async () => {
  const middleware = Middleware.Mware.websocket({
    listener: '/ws',
    allowedOrigins: '*'
  })
  const ctx = createTestContext('http://localhost/ws', {
    headers: new Headers({ Upgrade: 'websocket', Origin: 'https://evil.com' })
  })
  let nextCalled = false
  const next = (): Promise<Response> => {
    nextCalled = true
    return Promise.resolve(new Response('ok'))
  }
  const res = await middleware(ctx, next)
  assertEquals(nextCalled, false)
  assertEquals(res?.status === 403, false)
})

Deno.test('websocket with listener and upgrade header but wrong path calls next', async () => {
  const middleware = Middleware.Mware.websocket({ listener: '/ws' })
  const ctx = createTestContext('http://localhost/api', {
    headers: new Headers({ Upgrade: 'websocket' })
  })
  const next = async (): Promise<Response> => new Response('ok')
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(await res.text(), 'ok')
  }
})

Deno.test('websocket with listener but no upgrade header calls next', async () => {
  const middleware = Middleware.Mware.websocket({ listener: '/ws' })
  const ctx = createTestContext('http://localhost/ws')
  const next = async (): Promise<Response> => new Response('ok')
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(await res.text(), 'ok')
  }
})

Deno.test('websocket with listener path matching but case-insensitive upgrade calls next only if not websocket', async () => {
  const middleware = Middleware.Mware.websocket({ listener: '/ws' })
  const ctx = createTestContext('http://localhost/ws', {
    headers: new Headers({ Upgrade: 'HTTP' })
  })
  const next = async (): Promise<Response> => new Response('ok')
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(await res.text(), 'ok')
  }
})

Deno.test('websocket with no listener path calls next', async () => {
  const middleware = Middleware.Mware.websocket({})
  const ctx = createTestContext('http://localhost/')
  const next = async (): Promise<Response> => new Response('ok')
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(await res.text(), 'ok')
  }
})

Deno.test('websocket with upgrade header not websocket calls next', async () => {
  const middleware = Middleware.Mware.websocket({ listener: '/ws' })
  const ctx = createTestContext('http://localhost/ws', {
    headers: new Headers({ Upgrade: 'http' })
  })
  const next = async (): Promise<Response> => new Response('ok')
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(await res.text(), 'ok')
  }
})
