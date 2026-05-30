import type * as Types from '@interfaces/index.ts'
import { assertEquals } from '@std/assert'
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
    const err = new Error('inner fail') as Types.StatusError
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

Deno.test('Utils#wrapMiddleware defaults to 500 when no statusCode on error', async () => {
  const inner = async (): Promise<Response | undefined> => {
    throw new Error('no status')
  }
  const wrapped = Middleware.Utils.wrapMiddleware('Wrap', inner)
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
    assertEquals(res.status, 500)
    const text = await res.text()
    assertEquals(text.includes('no status'), true)
  }
})

Deno.test('Utils#wrapMiddleware handles error without message', async () => {
  const inner = async (): Promise<Response | undefined> => {
    throw new Error('')
  }
  const wrapped = Middleware.Utils.wrapMiddleware('ErrWrap', inner)
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
    assertEquals(res.status, 500)
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

Deno.test('Utils#wrapMiddleware preserves middleware response', async () => {
  const inner = async (): Promise<Response | undefined> => {
    return new Response('custom', { status: 201 })
  }
  const wrapped = Middleware.Utils.wrapMiddleware('Preserve', inner)
  const ctx = createTestContext('http://localhost/')
  const next = async (): Promise<Response> => new Response('should not')
  const res = await wrapped(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(res.status, 201)
    assertEquals(await res.text(), 'custom')
  }
})

Deno.test('Utils#wrapMiddleware uses label in error message', async () => {
  const inner = async (): Promise<Response | undefined> => {
    throw new Error('something broke')
  }
  const wrapped = Middleware.Utils.wrapMiddleware('MyLabel', inner)
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
    const text = await res.text()
    assertEquals(text.includes('MyLabel'), true)
    assertEquals(text.includes('something broke'), true)
  }
})

Deno.test('Utils#wrapMiddleware uses statusCode from thrown error', async () => {
  const inner = async (): Promise<Response | undefined> => {
    const err = new Error('forbidden action') as Types.StatusError
    err.statusCode = 403
    throw err
  }
  const wrapped = Middleware.Utils.wrapMiddleware('AuthCheck', inner)
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
    assertEquals(res.status, 403)
  }
})
