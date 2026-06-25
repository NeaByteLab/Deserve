import { assertEquals } from '@std/assert'
import { fileURLToPath } from 'node:url'
import * as Core from '@core/index.ts'
import Helper from '@tests/helper.ts'

const staticBasePath = fileURLToPath(import.meta.resolve('@tests/fixtures/static/')).replace(
  /[/\\]$/,
  ''
)

Deno.test('Static serveFile applies Cache-Control when configured', async () => {
  const ctx = Helper.createTestContext('http://localhost/index.html')
  const res = await Core.Static.serveFile(
    ctx,
    { path: staticBasePath, cacheControl: 3600 },
    '/index.html'
  )
  assertEquals(res.headers.get('cache-control'), 'public, max-age=3600')
  await res.body?.cancel()
})

Deno.test('Static serveFile defaults to index.html for root path', async () => {
  const ctx = Helper.createTestContext('http://localhost/')
  const res = await Core.Static.serveFile(ctx, { path: staticBasePath }, '/')
  assertEquals(res.status, 200)
  await res.body?.cancel()
})

Deno.test('Static serveFile rejects non GET or HEAD methods', async () => {
  const ctx = Helper.createTestContext('http://localhost/index.html', { method: 'POST' })
  const res = await Core.Static.serveFile(ctx, { path: staticBasePath }, '/index.html')
  assertEquals(res.status, 405)
  assertEquals(res.headers.get('allow'), 'GET, HEAD')
  await res.body?.cancel()
})

Deno.test('Static serveFile returns 304 when ETag matches', async () => {
  const first = Helper.createTestContext('http://localhost/index.html')
  const firstRes = await Core.Static.serveFile(first, { path: staticBasePath }, '/index.html')
  const etag = firstRes.headers.get('etag')!
  await firstRes.body?.cancel()
  const second = Helper.createTestContext('http://localhost/index.html', {
    headers: { 'If-None-Match': etag }
  })
  const res = await Core.Static.serveFile(second, { path: staticBasePath }, '/index.html')
  assertEquals(res.status, 304)
})

Deno.test('Static serveFile returns 404 for a missing file', async () => {
  const ctx = Helper.createTestContext('http://localhost/missing.txt')
  const res = await Core.Static.serveFile(ctx, { path: staticBasePath }, '/missing.txt')
  assertEquals(res.status, 404)
  await res.body?.cancel()
})

Deno.test('Static serveFile serves a byte range with 206', async () => {
  const ctx = Helper.createTestContext('http://localhost/index.html', {
    headers: { Range: 'bytes=0-3' }
  })
  const res = await Core.Static.serveFile(ctx, { path: staticBasePath }, '/index.html')
  assertEquals(res.status, 206)
  assertEquals(res.headers.get('content-range')?.startsWith('bytes 0-3/'), true)
  await res.body?.cancel()
})

Deno.test('Static serveFile serves a file from the base directory', async () => {
  const ctx = Helper.createTestContext('http://localhost/index.html')
  const res = await Core.Static.serveFile(ctx, { path: staticBasePath }, '/index.html')
  assertEquals(res.status, 200)
  assertEquals(res.headers.get('content-type'), 'text/html; charset=utf-8')
  assertEquals((await res.text()).includes('static fixture'), true)
})

Deno.test('Static serveFile sets an ETag header by default', async () => {
  const ctx = Helper.createTestContext('http://localhost/index.html')
  const res = await Core.Static.serveFile(ctx, { path: staticBasePath }, '/index.html')
  assertEquals(res.headers.get('etag')?.startsWith('W/'), true)
  await res.body?.cancel()
})
