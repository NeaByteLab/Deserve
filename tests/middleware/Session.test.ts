import { assertEquals } from '@std/assert'
import * as Middleware from '@middleware/index.ts'
import Helper from '@tests/helper.ts'

const secret = 'x'.repeat(32)

Deno.test('Session create returns a middleware function', () => {
  const mw = Middleware.Session.create({ secret })
  assertEquals(typeof mw, 'function')
})

Deno.test('Session create throws on SameSite None without secure', () => {
  let threw = false
  try {
    Middleware.Session.create({ secret, sameSite: 'None', secure: false })
  } catch (e) {
    threw = true
    assertEquals(e instanceof Deno.errors.InvalidData, true)
  }
  assertEquals(threw, true)
})

Deno.test('Session create throws on a non-positive maxAge', () => {
  let threw = false
  try {
    Middleware.Session.create({ secret, maxAge: 0 })
  } catch (e) {
    threw = true
    assertEquals(e instanceof Deno.errors.InvalidData, true)
  }
  assertEquals(threw, true)
})

Deno.test('Session create throws on a short secret', () => {
  let threw = false
  try {
    Middleware.Session.create({ secret: 'short' })
  } catch (e) {
    threw = true
    assertEquals(e instanceof Deno.errors.InvalidData, true)
  }
  assertEquals(threw, true)
})

Deno.test('Session ignores an unverifiable cookie value', async () => {
  const mw = Middleware.Session.create({ secret, secure: false })
  const ctx = Helper.createTestContext('http://localhost/', {
    headers: { cookie: 'session=tampered.value' }
  })
  await mw(ctx, Helper.okNext)
  assertEquals(ctx.get.session(), null)
})

Deno.test('Session round-trips written data into a readable cookie', async () => {
  const mw = Middleware.Session.create({ secret, secure: false })
  const writeCtx = Helper.createTestContext('http://localhost/')
  await mw(writeCtx, async () => {
    await writeCtx.set.session({ userId: 7 })
    return new Response('ok')
  })
  const written = writeCtx.send.text('x')
  const cookie = written.headers.get('set-cookie')!
  const value = cookie.slice('session='.length, cookie.indexOf(';'))

  const readCtx = Helper.createTestContext('http://localhost/', {
    headers: { cookie: `session=${value}` }
  })
  await mw(readCtx, Helper.okNext)
  assertEquals(readCtx.get.session(), { userId: 7 })
})
