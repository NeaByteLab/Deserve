import { assertEquals } from '@std/assert'
import { fileURLToPath } from 'node:url'
import * as Core from '@core/index.ts'

function createTestContext(url: string, requestInit?: RequestInit): Core.Context {
  const request = new Request(url, requestInit)
  return new Core.Context(request, new URL(url), {})
}

Deno.test('Static#serveStaticFile 304 response has an empty body and keeps Cache-Control', async () => {
  const basePath = fileURLToPath(import.meta.resolve('@tests/fixtures/static/')).replace(
    /[\\/]$/,
    ''
  )
  const ctxFirst = createTestContext('http://localhost/')
  const resFirst = await Core.Static.serveStaticFile(
    ctxFirst,
    { path: basePath, etag: true, cacheControl: 60 },
    '/'
  )
  const etag = resFirst.headers.get('ETag') ?? ''
  await resFirst.body?.cancel()

  const ctxSecond = createTestContext('http://localhost/', {
    headers: new Headers({ 'If-None-Match': etag })
  })
  const resSecond = await Core.Static.serveStaticFile(
    ctxSecond,
    { path: basePath, etag: true, cacheControl: 60 },
    '/'
  )
  assertEquals(resSecond.status, 304)
  assertEquals(resSecond.body, null)
  assertEquals(resSecond.headers.get('Cache-Control'), 'public, max-age=60')
})

Deno.test('Static#serveStaticFile blocks dotfile segments', async () => {
  const basePath = fileURLToPath(import.meta.resolve('@tests/fixtures/static/')).replace(
    /[\\/]$/,
    ''
  )
  const ctx = createTestContext('http://localhost/.env')
  const res = await Core.Static.serveStaticFile(ctx, { path: basePath }, '/')
  assertEquals(res.status, 404)
})

Deno.test('Static#serveStaticFile blocks nested dotfile path', async () => {
  const basePath = fileURLToPath(import.meta.resolve('@tests/fixtures/static/')).replace(
    /[\\/]$/,
    ''
  )
  const ctx = createTestContext('http://localhost/sub/.gitignore')
  const res = await Core.Static.serveStaticFile(ctx, { path: basePath }, '/')
  assertEquals(res.status, 404)
})

Deno.test('Static#serveStaticFile blocks path traversal via ..', async () => {
  const basePath = fileURLToPath(import.meta.resolve('@tests/fixtures/static/')).replace(
    /[\\/]$/,
    ''
  )
  const ctx = createTestContext('http://localhost/../response-file.txt')
  const res = await Core.Static.serveStaticFile(ctx, { path: basePath }, '/')
  assertEquals(res.status, 404)
})

Deno.test('Static#serveStaticFile clamps an over-long range end to the last byte', async () => {
  const basePath = fileURLToPath(import.meta.resolve('@tests/fixtures/static/')).replace(
    /[\\/]$/,
    ''
  )
  const ctx = createTestContext('http://localhost/style.css', {
    headers: new Headers({ Range: 'bytes=20-999' })
  })
  const res = await Core.Static.serveStaticFile(ctx, { path: basePath }, '/')
  assertEquals(res.status, 206)
  assertEquals(res.headers.get('Content-Range'), 'bytes 20-21/22')
  assertEquals(res.headers.get('Content-Length'), '2')
  await res.body?.cancel()
})

Deno.test('Static#serveStaticFile empty pathname serves index.html', async () => {
  const basePath = fileURLToPath(import.meta.resolve('@tests/fixtures/static/')).replace(
    /[\\/]$/,
    ''
  )
  const ctx = createTestContext('http://localhost/')
  const res = await Core.Static.serveStaticFile(ctx, { path: basePath }, '/')
  assertEquals(res.status, 200)
  assertEquals(res.headers.get('Content-Type'), 'text/html')
  const body = await res.text()
  assertEquals(body.includes('static fixture'), true)
})

Deno.test('Static#serveStaticFile honors a byte range with 206 and Content-Range', async () => {
  const basePath = fileURLToPath(import.meta.resolve('@tests/fixtures/static/')).replace(
    /[\\/]$/,
    ''
  )
  const ctx = createTestContext('http://localhost/style.css', {
    headers: new Headers({ Range: 'bytes=0-3' })
  })
  const res = await Core.Static.serveStaticFile(ctx, { path: basePath }, '/')
  assertEquals(res.status, 206)
  assertEquals(res.headers.get('Content-Range'), 'bytes 0-3/22')
  assertEquals(res.headers.get('Content-Length'), '4')
  assertEquals(res.headers.get('Accept-Ranges'), 'bytes')
  assertEquals(await res.text(), 'body')
})

Deno.test('Static#serveStaticFile ignores a multi-range request and serves the full body', async () => {
  const basePath = fileURLToPath(import.meta.resolve('@tests/fixtures/static/')).replace(
    /[\\/]$/,
    ''
  )
  const ctx = createTestContext('http://localhost/style.css', {
    headers: new Headers({ Range: 'bytes=0-3,5-7' })
  })
  const res = await Core.Static.serveStaticFile(ctx, { path: basePath }, '/')
  assertEquals(res.status, 200)
  assertEquals(res.headers.get('Content-Range'), null)
  assertEquals(res.headers.get('Content-Length'), '22')
  assertEquals(res.headers.get('Accept-Ranges'), 'bytes')
  await res.body?.cancel()
})

Deno.test('Static#serveStaticFile negative cacheControl does not set header', async () => {
  const basePath = fileURLToPath(import.meta.resolve('@tests/fixtures/static/')).replace(
    /[\\/]$/,
    ''
  )
  const ctx = createTestContext('http://localhost/')
  const res = await Core.Static.serveStaticFile(ctx, { path: basePath, cacheControl: -1 }, '/')
  assertEquals(res.status, 200)
  assertEquals(res.headers.get('Cache-Control'), null)
  await res.body?.cancel()
})

Deno.test('Static#serveStaticFile rejects an in-root symlink that escapes the base directory', async () => {
  const basePath = fileURLToPath(import.meta.resolve('@tests/fixtures/static/')).replace(
    /[\\/]$/,
    ''
  )
  const ctx = createTestContext('http://localhost/escape-link.txt')
  const res = await Core.Static.serveStaticFile(ctx, { path: basePath }, '/')
  assertEquals(res.status, 404)
  assertEquals((await res.text()).includes('OUTSIDE-ROOT-SECRET'), false)
})

Deno.test('Static#serveStaticFile returns 404 for missing file', async () => {
  const basePath = fileURLToPath(import.meta.resolve('@tests/fixtures/static/')).replace(
    /[\\/]$/,
    ''
  )
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

Deno.test('Static#serveStaticFile returns 416 for an unsatisfiable range', async () => {
  const basePath = fileURLToPath(import.meta.resolve('@tests/fixtures/static/')).replace(
    /[\\/]$/,
    ''
  )
  const ctx = createTestContext('http://localhost/style.css', {
    headers: new Headers({ Range: 'bytes=100-200' })
  })
  const res = await Core.Static.serveStaticFile(ctx, { path: basePath }, '/')
  await res.body?.cancel()
  assertEquals(res.status, 416)
  assertEquals(res.headers.get('Content-Range'), 'bytes */22')
})

Deno.test('Static#serveStaticFile serves a suffix range from the end of the file', async () => {
  const basePath = fileURLToPath(import.meta.resolve('@tests/fixtures/static/')).replace(
    /[\\/]$/,
    ''
  )
  const ctx = createTestContext('http://localhost/style.css', {
    headers: new Headers({ Range: 'bytes=-2' })
  })
  const res = await Core.Static.serveStaticFile(ctx, { path: basePath }, '/')
  assertEquals(res.status, 206)
  assertEquals(res.headers.get('Content-Range'), 'bytes 20-21/22')
  assertEquals((await res.text()).length, 2)
})

Deno.test('Static#serveStaticFile serves index.html when pathname is /', async () => {
  const ctx = createTestContext('http://localhost/')
  const basePath = fileURLToPath(import.meta.resolve('@tests/fixtures/static/')).replace(
    /[\\/]$/,
    ''
  )
  const res = await Core.Static.serveStaticFile(ctx, { path: basePath }, '/')
  assertEquals(res.status, 200)
  assertEquals(res.headers.get('Content-Type'), 'text/html')
  const body = await res.text()
  assertEquals(body.includes('static fixture'), true)
})

Deno.test('Static#serveStaticFile serves non-HTML file with correct Content-Type', async () => {
  const basePath = fileURLToPath(import.meta.resolve('@tests/fixtures/static/')).replace(
    /[\\/]$/,
    ''
  )
  const ctx = createTestContext('http://localhost/style.css')
  const res = await Core.Static.serveStaticFile(ctx, { path: basePath }, '/')
  assertEquals(res.status, 200)
  assertEquals(res.headers.get('Content-Type'), 'text/css')
  await res.body?.cancel()
})

Deno.test('Static#serveStaticFile sets Cache-Control when configured', async () => {
  const basePath = fileURLToPath(import.meta.resolve('@tests/fixtures/static/')).replace(
    /[\\/]$/,
    ''
  )
  const ctx = createTestContext('http://localhost/')
  const res = await Core.Static.serveStaticFile(ctx, { path: basePath, cacheControl: 3600 }, '/')
  assertEquals(res.status, 200)
  assertEquals(res.headers.get('Cache-Control'), 'public, max-age=3600')
  await res.body?.cancel()
})

Deno.test('Static#serveStaticFile with If-None-Match returns 304', async () => {
  const basePath = fileURLToPath(import.meta.resolve('@tests/fixtures/static/')).replace(
    /[\\/]$/,
    ''
  )
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

Deno.test('Static#serveStaticFile with comma-separated If-None-Match list returns 304', async () => {
  const basePath = fileURLToPath(import.meta.resolve('@tests/fixtures/static/')).replace(
    /[\\/]$/,
    ''
  )
  const first = await Core.Static.serveStaticFile(
    createTestContext('http://localhost/'),
    { path: basePath, etag: true },
    '/'
  )
  const etag = first.headers.get('ETag') ?? ''
  await first.body?.cancel()
  const ctx = createTestContext('http://localhost/', {
    headers: new Headers({ 'If-None-Match': `"other", ${etag}` })
  })
  const res = await Core.Static.serveStaticFile(ctx, { path: basePath, etag: true }, '/')
  assertEquals(res.status, 304)
})

Deno.test('Static#serveStaticFile with etag sets ETag header', async () => {
  const ctx = createTestContext('http://localhost/')
  const basePath = fileURLToPath(import.meta.resolve('@tests/fixtures/static/')).replace(
    /[\\/]$/,
    ''
  )
  const res = await Core.Static.serveStaticFile(ctx, { path: basePath, etag: true }, '/')
  assertEquals(res.status, 200)
  assertEquals(res.headers.get('ETag')?.startsWith('"'), true)
  await res.body?.cancel()
})

Deno.test('Static#serveStaticFile with non-matching If-None-Match serves the file', async () => {
  const basePath = fileURLToPath(import.meta.resolve('@tests/fixtures/static/')).replace(
    /[\\/]$/,
    ''
  )
  const ctx = createTestContext('http://localhost/', {
    headers: new Headers({ 'If-None-Match': '"does-not-match"' })
  })
  const res = await Core.Static.serveStaticFile(ctx, { path: basePath, etag: true }, '/')
  assertEquals(res.status, 200)
  await res.body?.cancel()
})

Deno.test('Static#serveStaticFile with relative path resolves against cwd', async () => {
  const ctx = createTestContext('http://localhost/')
  const res = await Core.Static.serveStaticFile(
    ctx,
    { path: './tests/fixtures/static' },
    '/'
  )
  assertEquals(res.status, 200)
  assertEquals(res.headers.get('Content-Type'), 'text/html')
  const body = await res.text()
  assertEquals(body.includes('static fixture'), true)
})

Deno.test('Static#serveStaticFile with weak If-None-Match validator returns 304', async () => {
  const basePath = fileURLToPath(import.meta.resolve('@tests/fixtures/static/')).replace(
    /[\\/]$/,
    ''
  )
  const first = await Core.Static.serveStaticFile(
    createTestContext('http://localhost/'),
    { path: basePath, etag: true },
    '/'
  )
  const etag = first.headers.get('ETag') ?? ''
  await first.body?.cancel()
  const ctx = createTestContext('http://localhost/', {
    headers: new Headers({ 'If-None-Match': `W/${etag}` })
  })
  const res = await Core.Static.serveStaticFile(ctx, { path: basePath, etag: true }, '/')
  assertEquals(res.status, 304)
})

Deno.test('Static#serveStaticFile with wildcard If-None-Match returns 304', async () => {
  const basePath = fileURLToPath(import.meta.resolve('@tests/fixtures/static/')).replace(
    /[\\/]$/,
    ''
  )
  const ctx = createTestContext('http://localhost/', {
    headers: new Headers({ 'If-None-Match': '*' })
  })
  const res = await Core.Static.serveStaticFile(ctx, { path: basePath, etag: true }, '/')
  assertEquals(res.status, 304)
})
