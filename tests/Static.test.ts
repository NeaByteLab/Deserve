import { assertEquals } from 'jsr:@std/assert'
import { Context, Static } from '@app/index.ts'

function createTestContext(url: string, requestInit?: RequestInit): Context {
  const request = new Request(url, requestInit)
  return new Context(request, new URL(url), {})
}

Deno.test('Static#serveStaticFile returns 404 for missing file', async () => {
  const basePath = new URL('fixtures/static/', import.meta.url).pathname.replace(/\/$/, '')
  const handleError = async (_ctx: Context, status: number): Promise<Response> =>
    new Response('not found', { status })
  const ctxWithHandler = new Context(
    new Request('http://localhost/nonexistent.html'),
    new URL('http://localhost/nonexistent.html'),
    {},
    handleError
  )
  const res = await Static.serveStaticFile(ctxWithHandler, { path: basePath }, '/')
  assertEquals(res.status, 404)
})

Deno.test('Static#serveStaticFile serves index.html when pathname is /', async () => {
  const ctx = createTestContext('http://localhost/')
  const basePath = new URL('fixtures/static/', import.meta.url).pathname.replace(/\/$/, '')
  const res = await Static.serveStaticFile(ctx, { path: basePath }, '/')
  assertEquals(res.status, 200)
  assertEquals(res.headers.get('Content-Type'), 'text/html')
  const body = await res.text()
  assertEquals(body.includes('static fixture'), true)
})

Deno.test('Static#serveStaticFile with etag sets ETag header', async () => {
  const ctx = createTestContext('http://localhost/')
  const basePath = new URL('fixtures/static/', import.meta.url).pathname.replace(/\/$/, '')
  const res = await Static.serveStaticFile(ctx, { path: basePath, etag: true }, '/')
  assertEquals(res.status, 200)
  assertEquals(res.headers.get('ETag')?.startsWith('"'), true)
  await res.body?.cancel()
})
