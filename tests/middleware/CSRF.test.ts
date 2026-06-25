import { assertEquals } from '@std/assert'
import * as Middleware from '@middleware/index.ts'
import Helper from '@tests/helper.ts'

Deno.test('CSRF create allows a request with sec-fetch-site same-origin', async () => {
  const mw = Middleware.CSRF.create()
  const ctx = Helper.createTestContext('http://localhost/', {
    method: 'POST',
    headers: { 'sec-fetch-site': 'same-origin' }
  })
  const res = await mw(ctx, Helper.okNext)
  assertEquals(await res?.text(), 'ok')
})

Deno.test('CSRF create allows a same-origin POST request', async () => {
  const mw = Middleware.CSRF.create()
  const ctx = Helper.createTestContext('http://localhost/', {
    method: 'POST',
    headers: { origin: 'http://localhost' }
  })
  const res = await mw(ctx, Helper.okNext)
  assertEquals(await res?.text(), 'ok')
})

Deno.test('CSRF create allows safe GET requests', async () => {
  const mw = Middleware.CSRF.create()
  const ctx = Helper.createTestContext('http://localhost/', { method: 'GET' })
  const res = await mw(ctx, Helper.okNext)
  assertEquals(await res?.text(), 'ok')
})

Deno.test('CSRF create honors an explicit allowed origin', async () => {
  const mw = Middleware.CSRF.create({ origin: 'https://app.test' })
  const ctx = Helper.createTestContext('http://localhost/', {
    method: 'POST',
    headers: { origin: 'https://app.test' }
  })
  const res = await mw(ctx, Helper.okNext)
  assertEquals(await res?.text(), 'ok')
})

Deno.test('CSRF create returns 403 for a cross-origin POST', async () => {
  const mw = Middleware.CSRF.create()
  const ctx = Helper.createTestContext('http://localhost/', {
    method: 'POST',
    headers: { origin: 'https://external.test' }
  })
  const res = await mw(ctx, Helper.okNext)
  assertEquals(res?.status, 403)
})

Deno.test('CSRF create returns 403 when origin signals are absent', async () => {
  const mw = Middleware.CSRF.create()
  const ctx = Helper.createTestContext('http://localhost/', { method: 'POST' })
  const res = await mw(ctx, Helper.okNext)
  assertEquals(res?.status, 403)
})
