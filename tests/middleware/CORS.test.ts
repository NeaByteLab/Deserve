import { assertEquals } from '@std/assert'
import * as Middleware from '@middleware/index.ts'
import Helper from '@tests/helper.ts'

Deno.test('CORS create answers preflight with 204', async () => {
  const mw = Middleware.CORS.create()
  const ctx = Helper.createTestContext('http://localhost/', {
    method: 'OPTIONS',
    headers: { origin: 'https://app.test' }
  })
  const res = await mw(ctx, Helper.okNext)
  assertEquals(res?.status, 204)
  assertEquals(res?.headers.get('access-control-allow-methods')?.includes('GET'), true)
})

Deno.test('CORS create matches an explicit origin list', async () => {
  const mw = Middleware.CORS.create({ origin: ['https://app.test'] })
  const ctx = Helper.createTestContext('http://localhost/', {
    headers: { origin: 'https://app.test' }
  })
  await mw(ctx, Helper.okNext)
  const res = ctx.send.text('x')
  assertEquals(res.headers.get('access-control-allow-origin'), 'https://app.test')
  assertEquals(res.headers.get('vary'), 'Origin')
})

Deno.test('CORS create omits allow-origin for an unmatched origin', async () => {
  const mw = Middleware.CORS.create({ origin: ['https://app.test'] })
  const ctx = Helper.createTestContext('http://localhost/', {
    headers: { origin: 'https://external.test' }
  })
  const res = await mw(ctx, Helper.okNext)
  assertEquals(res?.headers.get('access-control-allow-origin'), null)
})

Deno.test('CORS create passes through when no origin header', async () => {
  const mw = Middleware.CORS.create()
  const ctx = Helper.createTestContext('http://localhost/')
  const res = await mw(ctx, Helper.okNext)
  assertEquals(await res?.text(), 'ok')
})

Deno.test('CORS create reflects wildcard origin on a simple request', async () => {
  const mw = Middleware.CORS.create()
  const ctx = Helper.createTestContext('http://localhost/', {
    headers: { origin: 'https://app.test' }
  })
  await mw(ctx, Helper.okNext)
  const res = ctx.send.text('x')
  assertEquals(res.headers.get('access-control-allow-origin'), '*')
})

Deno.test('CORS create sets credentials header when enabled', async () => {
  const mw = Middleware.CORS.create({ origin: ['https://app.test'], credentials: true })
  const ctx = Helper.createTestContext('http://localhost/', {
    headers: { origin: 'https://app.test' }
  })
  await mw(ctx, Helper.okNext)
  const res = ctx.send.text('x')
  assertEquals(res.headers.get('access-control-allow-credentials'), 'true')
})

Deno.test('CORS create throws on credentials with wildcard origin', () => {
  let threw = false
  try {
    Middleware.CORS.create({ credentials: true })
  } catch (e) {
    threw = true
    assertEquals(e instanceof Deno.errors.InvalidData, true)
  }
  assertEquals(threw, true)
})
