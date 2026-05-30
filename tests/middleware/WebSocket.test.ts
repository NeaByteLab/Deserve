import { assertEquals } from '@std/assert'
import * as Core from '@core/index.ts'
import * as Middleware from '@middleware/index.ts'

function createTestContext(url = 'http://localhost/', requestInit?: RequestInit): Core.Context {
  const request = new Request(url, requestInit)
  return new Core.Context(request, new URL(url), {})
}

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
