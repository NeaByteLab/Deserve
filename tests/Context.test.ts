import { assertEquals } from 'jsr:@std/assert'
import { Context } from '@app/index.ts'

function createTestContext(
  url = 'http://localhost/',
  routeParams: Record<string, string> = {},
  requestInit?: RequestInit
): Context {
  const request = new Request(url, requestInit)
  return new Context(request, new URL(url), routeParams)
}

Deno.test('Context#body parses form-urlencoded as FormData', async () => {
  const ctx = createTestContext(
    'http://localhost/',
    {},
    {
      method: 'POST',
      body: 'foo=bar&baz=qux',
      headers: new Headers({ 'Content-Type': 'application/x-www-form-urlencoded' })
    }
  )
  const formData = (await ctx.body()) as FormData
  assertEquals(formData.get('foo'), 'bar')
  assertEquals(formData.get('baz'), 'qux')
})

Deno.test('Context#body parses JSON and caches result', async () => {
  const ctx = createTestContext(
    'http://localhost/',
    {},
    {
      method: 'POST',
      body: JSON.stringify({ a: 1, b: 'x' }),
      headers: new Headers({ 'Content-Type': 'application/json' })
    }
  )
  const firstParsedBody = (await ctx.body()) as { a: number; b: string }
  assertEquals(firstParsedBody.a, 1)
  assertEquals(firstParsedBody.b, 'x')
  const secondParsedBody = await ctx.body()
  assertEquals(secondParsedBody, firstParsedBody)
})

Deno.test('Context#body then formData throws when body already parsed as non-form', async () => {
  const ctx = createTestContext(
    'http://localhost/',
    {},
    {
      method: 'POST',
      body: JSON.stringify({ a: 1 }),
      headers: new Headers({ 'Content-Type': 'application/json' })
    }
  )
  await ctx.body()
  let thrown = false
  try {
    await ctx.formData()
  } catch (e) {
    thrown = true
    assertEquals((e as Error).message, 'Request body already consumed')
  }
  assertEquals(thrown, true)
})

Deno.test('Context#cookie returns value by key', () => {
  const ctx = createTestContext(
    'http://localhost/',
    {},
    {
      headers: new Headers({ Cookie: 'sid=abc123; foo=bar' })
    }
  )
  assertEquals(ctx.cookie('sid'), 'abc123')
  assertEquals(ctx.cookie('foo'), 'bar')
  assertEquals(ctx.cookie('missing'), undefined)
})

Deno.test('Context#cookie without key returns all cookies', () => {
  const ctx = createTestContext(
    'http://localhost/',
    {},
    {
      headers: new Headers({ Cookie: 'a=1; b=2' })
    }
  )
  const allCookies = ctx.cookie() as Record<string, string>
  assertEquals(allCookies['a'], '1')
  assertEquals(allCookies['b'], '2')
})

Deno.test('Context#handleError when errorHandler throws propagates', async () => {
  const request = new Request('http://localhost/')
  const ctx = new Context(request, new URL('http://localhost/'), {}, (_ctx, _code, _err) => {
    throw new Error('handler threw')
  })
  let thrown = false
  try {
    await ctx.handleError(500, new Error('original'))
  } catch (e) {
    thrown = true
    assertEquals((e as Error).message, 'handler threw')
  }
  assertEquals(thrown, true)
})

Deno.test('Context#handleError with handler uses custom response', async () => {
  const request = new Request('http://localhost/')
  const ctx = new Context(request, new URL('http://localhost/'), {}, async (_, statusCode) => {
    return new Response(`custom ${statusCode}`, { status: statusCode })
  })
  const res = await ctx.handleError(418, new Error('teapot'))
  assertEquals(res.status, 418)
  assertEquals(await res.text(), 'custom 418')
})

Deno.test('Context#handleError without handler returns response with status only', async () => {
  const ctx = createTestContext('http://localhost/')
  const res = await ctx.handleError(503, new Error('unavailable'))
  assertEquals(res.status, 503)
})

Deno.test('Context#header returns value by key (case-insensitive)', () => {
  const ctx = createTestContext(
    'http://localhost/',
    {},
    {
      headers: new Headers({ 'X-Custom': 'value', Accept: 'text/html' })
    }
  )
  assertEquals(ctx.header('x-custom'), 'value')
  assertEquals(ctx.header('Accept'), 'text/html')
})

Deno.test('Context#json then text throws already consumed', async () => {
  const ctx = createTestContext(
    'http://localhost/',
    {},
    {
      method: 'POST',
      body: JSON.stringify({ x: 1 }),
      headers: new Headers({ 'Content-Type': 'application/json' })
    }
  )
  await ctx.json()
  let thrown = false
  try {
    await ctx.text()
  } catch (e) {
    thrown = true
    assertEquals((e as Error).message, 'Request body already consumed')
  }
  assertEquals(thrown, true)
})

Deno.test('Context#param returns route param by key', () => {
  const ctx = createTestContext('http://localhost/items/42', { id: '42' })
  assertEquals(ctx.param('id'), '42')
  assertEquals(ctx.param('missing'), undefined)
})

Deno.test('Context#params returns copy of route params', () => {
  const ctx = createTestContext('http://localhost/', { a: '1', b: '2' })
  const paramsCopy = ctx.params()
  assertEquals(paramsCopy, { a: '1', b: '2' })
  paramsCopy['a'] = 'x'
  assertEquals(ctx.param('a'), '1')
})

Deno.test('Context#pathname returns URL pathname', () => {
  const ctx = createTestContext('http://localhost/items/42')
  assertEquals(ctx.pathname, '/items/42')
})

Deno.test('Context#query returns query value by key', () => {
  const ctx = createTestContext('http://localhost/?foo=bar&baz=qux')
  assertEquals(ctx.query('foo'), 'bar')
  assertEquals(ctx.query('baz'), 'qux')
  assertEquals(ctx.query('missing'), undefined)
})

Deno.test('Context#queries returns all values for a key', () => {
  const ctx = createTestContext('http://localhost/?tag=a&tag=b')
  assertEquals(ctx.queries('tag'), ['a', 'b'])
})

Deno.test('Context#redirect returns 302 with Location header', () => {
  const ctx = createTestContext('http://localhost/')
  const res = ctx.redirect('/login')
  assertEquals(res.status, 302)
  assertEquals(res.headers.get('Location'), 'http://localhost/login')
})

Deno.test('Context#redirect with status uses given status', () => {
  const ctx = createTestContext('http://localhost/')
  const res = ctx.redirect('/gone', 301)
  assertEquals(res.status, 301)
})

Deno.test('Context#replaceRequest resets body so body can be read again', async () => {
  const ctx = createTestContext(
    'http://localhost/',
    {},
    {
      method: 'POST',
      body: 'foo=bar',
      headers: new Headers({ 'Content-Type': 'application/x-www-form-urlencoded' })
    }
  )
  const first = (await ctx.body()) as FormData
  assertEquals(first.get('foo'), 'bar')
  const newReq = new Request('http://localhost/', {
    method: 'POST',
    body: 'baz=qux',
    headers: new Headers({ 'Content-Type': 'application/x-www-form-urlencoded' })
  })
  ctx.replaceRequest(newReq)
  const second = (await ctx.body()) as FormData
  assertEquals(second.get('baz'), 'qux')
})

Deno.test('Context#send.html returns 200 HTML response', () => {
  const ctx = createTestContext('http://localhost/')
  const res = ctx.send.html('<p>ok</p>')
  assertEquals(res.status, 200)
  assertEquals(res.headers.get('Content-Type'), 'text/html')
})

Deno.test('Context#send.json returns 200 with application/json', () => {
  const ctx = createTestContext('http://localhost/')
  const res = ctx.send.json({ ok: true })
  assertEquals(res.status, 200)
  assertEquals(res.headers.get('Content-Type'), 'application/json')
})

Deno.test('Context#send.text returns text/plain', () => {
  const ctx = createTestContext('http://localhost/')
  const res = ctx.send.text('plain')
  assertEquals(res.status, 200)
  assertEquals(res.headers.get('Content-Type'), 'text/plain')
})

Deno.test('Context#setHeader merges into response', () => {
  const ctx = createTestContext('http://localhost/')
  ctx.setHeader('X-Custom', 'value')
  const res = ctx.send.html('<p>ok</p>')
  assertEquals(res.headers.get('X-Custom'), 'value')
  assertEquals(res.headers.get('Content-Type'), 'text/html')
})

Deno.test('Context#state is mutable and shared', () => {
  const ctx = createTestContext('http://localhost/')
  assertEquals(ctx.state['session'], undefined)
  ctx.state['session'] = { user: 'x' }
  assertEquals((ctx.state['session'] as { user: string })?.user, 'x')
})

Deno.test('Context#url returns request url', () => {
  const ctx = createTestContext('http://localhost/items?q=1')
  assertEquals(ctx.url, 'http://localhost/items?q=1')
})
