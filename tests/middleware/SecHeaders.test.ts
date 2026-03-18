import { assertEquals } from 'jsr:@std/assert'
import * as Core from '@core/index.ts'
import * as Middleware from '@middleware/index.ts'

function createTestContext(url = 'http://localhost/', requestInit?: RequestInit): Core.Context {
  const request = new Request(url, requestInit)
  return new Core.Context(request, new URL(url), {})
}

Deno.test('securityHeaders can set multiple headers', async () => {
  const middleware = Middleware.Mware.securityHeaders({
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
  const middleware = Middleware.Mware.securityHeaders({ xContentTypeOptions: 'nosniff' })
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
  const middleware = Middleware.Mware.securityHeaders({ xContentTypeOptions: false })
  const ctx = createTestContext()
  const next = async (): Promise<Response> => new Response()
  await middleware(ctx, next)
  assertEquals(ctx.responseHeadersMap['X-Content-Type-Options'], undefined)
})
