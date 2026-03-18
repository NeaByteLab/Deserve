import { assertEquals } from 'jsr:@std/assert'
import * as Core from '@core/index.ts'
import * as Middleware from '@middleware/index.ts'

function createTestContext(url = 'http://localhost/', requestInit?: RequestInit): Core.Context {
  const request = new Request(url, requestInit)
  return new Core.Context(request, new URL(url), {})
}

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
