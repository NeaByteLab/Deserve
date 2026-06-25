import { assertEquals } from '@std/assert'
import * as Middleware from '@middleware/index.ts'
import Helper from '@tests/helper.ts'

Deno.test('BodyLimit create passes requests under the limit', async () => {
  const mw = Middleware.BodyLimit.create({ limit: 100 })
  const ctx = Helper.createTestContext('http://localhost/', {
    method: 'POST',
    headers: { 'content-length': '50' }
  })
  const res = await mw(ctx, Helper.okNext)
  assertEquals(await res?.text(), 'ok')
})

Deno.test('BodyLimit create passes when content-length absent', async () => {
  const mw = Middleware.BodyLimit.create({ limit: 100 })
  const ctx = Helper.createTestContext('http://localhost/', { method: 'POST' })
  const res = await mw(ctx, Helper.okNext)
  assertEquals(await res?.text(), 'ok')
})

Deno.test('BodyLimit create returns 413 for a negative content-length', async () => {
  const mw = Middleware.BodyLimit.create({ limit: 100 })
  const ctx = Helper.createTestContext('http://localhost/', {
    method: 'POST',
    headers: { 'content-length': '-1' }
  })
  const res = await mw(ctx, Helper.okNext)
  assertEquals(res?.status, 413)
})

Deno.test('BodyLimit create returns 413 for requests over the limit', async () => {
  const mw = Middleware.BodyLimit.create({ limit: 100 })
  const ctx = Helper.createTestContext('http://localhost/', {
    method: 'POST',
    headers: { 'content-length': '200' }
  })
  const res = await mw(ctx, Helper.okNext)
  assertEquals(res?.status, 413)
})

Deno.test('BodyLimit create skips GET requests', async () => {
  const mw = Middleware.BodyLimit.create({ limit: 1 })
  const ctx = Helper.createTestContext('http://localhost/', {
    method: 'GET',
    headers: { 'content-length': '999' }
  })
  const res = await mw(ctx, Helper.okNext)
  assertEquals(await res?.text(), 'ok')
})

Deno.test('BodyLimit create throws on a non-positive limit', () => {
  let threw = false
  try {
    Middleware.BodyLimit.create({ limit: 0 })
  } catch (e) {
    threw = true
    assertEquals(e instanceof Deno.errors.InvalidData, true)
  }
  assertEquals(threw, true)
})
