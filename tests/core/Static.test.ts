import { assertEquals } from 'jsr:@std/assert'
import * as Core from '@core/index.ts'

function createTestContext(url: string, requestInit?: RequestInit): Core.Context {
  const request = new Request(url, requestInit)
  return new Core.Context(request, new URL(url), {})
}

Deno.test('Static#serveStaticFile blocks path traversal via ..', async () => {
  const basePath = new URL('../fixtures/static/', import.meta.url).pathname.replace(/\/$/, '')
  const ctx = createTestContext('http://localhost/../response-file.txt')
  const res = await Core.Static.serveStaticFile(ctx, { path: basePath }, '/')
  assertEquals(res.status, 404)
})

Deno.test('Static#serveStaticFile returns 404 for missing file', async () => {
  const basePath = new URL('../fixtures/static/', import.meta.url).pathname.replace(/\/$/, '')
  const handleError = async (_ctx: Core.Context, status: number): Promise<Response> =>
    new Response('not found', { status })
  const ctxWithHandler = new Core.Context(
    new Request('http://localhost/nonexistent.html'),
    new URL('http://localhost/nonexistent.html'),
    {},
    handleError
  )
  const res = await Core.Static.serveStaticFile(ctxWithHandler, { path: basePath }, '/')
  assertEquals(res.status, 404)
})

Deno.test('Static#serveStaticFile serves index.html when pathname is /', async () => {
  const ctx = createTestContext('http://localhost/')
  const basePath = new URL('../fixtures/static/', import.meta.url).pathname.replace(/\/$/, '')
  const res = await Core.Static.serveStaticFile(ctx, { path: basePath }, '/')
  assertEquals(res.status, 200)
  assertEquals(res.headers.get('Content-Type'), 'text/html')
  const body = await res.text()
  assertEquals(body.includes('static fixture'), true)
})

Deno.test('Static#serveStaticFile sets Cache-Control when configured', async () => {
  const basePath = new URL('../fixtures/static/', import.meta.url).pathname.replace(/\/$/, '')
  const ctx = createTestContext('http://localhost/')
  const res = await Core.Static.serveStaticFile(ctx, { path: basePath, cacheControl: 3600 }, '/')
  assertEquals(res.status, 200)
  assertEquals(res.headers.get('Cache-Control'), 'public, max-age=3600')
  await res.body?.cancel()
})

Deno.test('Static#serveStaticFile with etag sets ETag header', async () => {
  const ctx = createTestContext('http://localhost/')
  const basePath = new URL('../fixtures/static/', import.meta.url).pathname.replace(/\/$/, '')
  const res = await Core.Static.serveStaticFile(ctx, { path: basePath, etag: true }, '/')
  assertEquals(res.status, 200)
  assertEquals(res.headers.get('ETag')?.startsWith('"'), true)
  await res.body?.cancel()
})

Deno.test('Static#serveStaticFile with If-None-Match returns 304', async () => {
  const basePath = new URL('../fixtures/static/', import.meta.url).pathname.replace(/\/$/, '')
  const ctxFirst = createTestContext('http://localhost/')
  const resFirst = await Core.Static.serveStaticFile(ctxFirst, { path: basePath, etag: true }, '/')
  const etag = resFirst.headers.get('ETag')
  assertEquals(typeof etag, 'string')
  await resFirst.body?.cancel()

  const ctxSecond = createTestContext('http://localhost/', {
    headers: new Headers({ 'If-None-Match': etag ?? '' })
  })
  const resSecond = await Core.Static.serveStaticFile(
    ctxSecond,
    { path: basePath, etag: true },
    '/'
  )
  assertEquals(resSecond.status, 304)
  assertEquals(resSecond.headers.get('ETag'), etag)
})
