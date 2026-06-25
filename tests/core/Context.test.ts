import { assertEquals } from '@std/assert'
import * as Core from '@core/index.ts'
import Helper from '@tests/helper.ts'

Deno.test('Context get.cookie parses cookie header', () => {
  const ctx = Helper.createTestContext('http://localhost/', {
    headers: { cookie: 'a=1; b=2' }
  })
  assertEquals(ctx.get.cookie('a'), '1')
  assertEquals(ctx.get.cookie('b'), '2')
})

Deno.test('Context get.header reads a single header value', () => {
  const ctx = Helper.createTestContext('http://localhost/', {
    headers: { 'x-test': 'value' }
  })
  assertEquals(ctx.get.header('x-test'), 'value')
})

Deno.test('Context get.json reads JSON body', async () => {
  const ctx = Helper.createTestContext('http://localhost/', {
    method: 'POST',
    body: JSON.stringify({ name: 'x' }),
    headers: { 'content-type': 'application/json' }
  })
  assertEquals(await ctx.get.json(), { name: 'x' })
})

Deno.test('Context get.json throws after body was already consumed as text', async () => {
  const ctx = Helper.createTestContext('http://localhost/', {
    method: 'POST',
    body: 'hello'
  })
  await ctx.get.text()
  let threw = false
  try {
    await ctx.get.json()
  } catch {
    threw = true
  }
  assertEquals(threw, true)
})

Deno.test('Context get.method returns request method', () => {
  const ctx = Helper.createTestContext('http://localhost/', { method: 'POST' })
  assertEquals(ctx.get.method(), 'POST')
})

Deno.test('Context get.query reads a single query value', () => {
  const ctx = Helper.createTestContext('http://localhost/?page=2')
  assertEquals(ctx.get.query('page'), '2')
})

Deno.test('Context get.query returns a record when no key given', () => {
  const ctx = Helper.createTestContext('http://localhost/?a=1&b=2')
  assertEquals(ctx.get.query(), { a: '1', b: '2' })
})

Deno.test('Context get.url and pathname expose parsed URL', () => {
  const ctx = Helper.createTestContext('http://localhost/users?page=2')
  assertEquals(ctx.get.url().href, 'http://localhost/users?page=2')
  assertEquals(ctx.get.pathname(), '/users')
})

Deno.test('Context get.validated throws without validate middleware', () => {
  const ctx = Helper.createTestContext()
  let threw = false
  try {
    ctx.get.validated()
  } catch (e) {
    threw = true
    assertEquals(e instanceof Deno.errors.NotSupported, true)
  }
  assertEquals(threw, true)
})

Deno.test('Context get.worker throws without worker pool', () => {
  const ctx = Helper.createTestContext()
  let threw = false
  try {
    ctx.get.worker()
  } catch (e) {
    threw = true
    assertEquals(e instanceof Deno.errors.NotSupported, true)
  }
  assertEquals(threw, true)
})

Deno.test('Context handleError builds a default error response', async () => {
  const ctx = Helper.createTestContext('http://localhost/missing', {
    headers: { accept: 'text/html' }
  })
  const res = await ctx.handleError(404, new Error('nope'))
  assertEquals(res.status, 404)
  assertEquals(res.headers.get('content-type'), 'text/html; charset=utf-8')
})

Deno.test('Context handleError negotiates JSON when accepted', async () => {
  const ctx = Helper.createTestContext('http://localhost/missing', {
    headers: { accept: 'application/json' }
  })
  const res = await ctx.handleError(404, new Error('nope'))
  assertEquals(res.status, 404)
  assertEquals(res.headers.get('content-type'), 'application/problem+json')
})

Deno.test('Context internalOf exposes the control surface', () => {
  const ctx = Helper.createTestContext()
  const internal = Core.Context.internalOf(ctx)
  assertEquals(typeof internal.setParams, 'function')
  assertEquals(typeof internal.finalizeRaw, 'function')
})

Deno.test('Context render throws when no view engine configured', async () => {
  const ctx = Helper.createTestContext()
  let threw = false
  try {
    await ctx.render('template')
  } catch (e) {
    threw = true
    assertEquals(e instanceof Deno.errors.NotSupported, true)
  }
  assertEquals(threw, true)
})

Deno.test('Context send.empty builds a null body response', () => {
  const ctx = Helper.createTestContext()
  const res = ctx.send.empty(204)
  assertEquals(res.status, 204)
  assertEquals(res.body, null)
})

Deno.test('Context send.json builds a JSON response', async () => {
  const ctx = Helper.createTestContext()
  const res = ctx.send.json({ ok: true })
  assertEquals(await res.json(), { ok: true })
  assertEquals(res.headers.get('content-type'), 'application/json')
})

Deno.test('Context send.json rejects invalid status code', () => {
  const ctx = Helper.createTestContext()
  let threw = false
  try {
    ctx.send.json({}, { status: 999 as 200 })
  } catch (e) {
    threw = true
    assertEquals(e instanceof Deno.errors.InvalidData, true)
  }
  assertEquals(threw, true)
})

Deno.test('Context send.text builds a text response', async () => {
  const ctx = Helper.createTestContext()
  const res = ctx.send.text('hello')
  assertEquals(await res.text(), 'hello')
  assertEquals(res.headers.get('content-type'), 'text/plain; charset=utf-8')
})

Deno.test('Context set.header and set.cookie reflect in response', () => {
  const ctx = Helper.createTestContext()
  ctx.set.header('x-a', '1').cookie('sid', 'abc')
  const res = ctx.send.text('x')
  assertEquals(res.headers.get('x-a'), '1')
  assertEquals(res.headers.get('set-cookie')?.startsWith('sid=abc'), true)
})

Deno.test('Context set.session write throws without session middleware', async () => {
  const ctx = Helper.createTestContext()
  let threw = false
  try {
    await ctx.set.session({ id: 1 })
  } catch (e) {
    threw = true
    assertEquals(e instanceof Deno.errors.NotSupported, true)
  }
  assertEquals(threw, true)
})

Deno.test('Context setParams decodes percent-encoded values', () => {
  const ctx = Helper.createTestContext('http://localhost/')
  Core.Context.internalOf(ctx).setParams({ name: 'a%20b' })
  assertEquals(ctx.get.param('name'), 'a b')
})
