import { assertEquals } from 'jsr:@std/assert'
import * as Core from '@core/index.ts'
import * as Middleware from '@middleware/index.ts'

function createTestContext(
  url = 'http://localhost/',
  requestInit?: RequestInit,
  handleError?: (ctx: Core.Context, status: number, err: unknown) => Response | Promise<Response>
): Core.Context {
  const request = new Request(url, requestInit)
  return new Core.Context(request, new URL(url), {}, handleError ?? (async () => new Response()))
}

Deno.test('Utils#wrapMiddleware calls handleError when middleware throws', async () => {
  const inner = async (): Promise<Response | undefined> => {
    const err = new Error('inner fail') as Error & { statusCode?: number }
    err.statusCode = 422
    throw err
  }
  const wrapped = Middleware.Utils.wrapMiddleware('Label', inner)
  const request = new Request('http://localhost/')
  const ctx = new Core.Context(
    request,
    new URL('http://localhost/'),
    {},
    async (_ctx, status, err) => new Response(err instanceof Error ? err.message : '', { status })
  )
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

Deno.test('Utils#wrapMiddleware passes through when middleware succeeds', async () => {
  const inner = async (_ctx: Core.Context, next: () => Promise<Response | undefined>) =>
    await next()
  const wrapped = Middleware.Utils.wrapMiddleware('Test', inner)
  const ctx = createTestContext('http://localhost/')
  const next = async (): Promise<Response> => new Response('ok')
  const res = await wrapped(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(await res.text(), 'ok')
  }
})
