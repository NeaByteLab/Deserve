import { assertEquals } from '@std/assert'
import * as Middleware from '@middleware/index.ts'
import Helper from '@tests/helper.ts'

Deno.test('BasicAuth create accepts a lowercase basic scheme', async () => {
  const mw = Middleware.BasicAuth.create({ users: [{ username: 'u', password: 'p' }] })
  const ctx = Helper.createTestContext('http://localhost/', {
    headers: { Authorization: 'basic ' + btoa('u:p') }
  })
  const res = await mw(ctx, Helper.okNext)
  assertEquals(await res?.text(), 'ok')
})

Deno.test('BasicAuth create accepts valid credentials', async () => {
  const mw = Middleware.BasicAuth.create({ users: [{ username: 'u', password: 'p' }] })
  const ctx = Helper.createTestContext('http://localhost/', {
    headers: { Authorization: 'Basic ' + btoa('u:p') }
  })
  const res = await mw(ctx, Helper.okNext)
  assertEquals(await res?.text(), 'ok')
})

Deno.test('BasicAuth create honors a custom realm', async () => {
  const mw = Middleware.BasicAuth.create({
    users: [{ username: 'u', password: 'p' }],
    realm: 'Admin'
  })
  const ctx = Helper.createTestContext()
  const res = await mw(ctx, Helper.okNext)
  assertEquals(res?.headers.get('www-authenticate'), 'Basic realm="Admin"')
})

Deno.test('BasicAuth create matches a second user', async () => {
  const mw = Middleware.BasicAuth.create({
    users: [{ username: 'a', password: '1' }, { username: 'b', password: '2' }]
  })
  const ctx = Helper.createTestContext('http://localhost/', {
    headers: { Authorization: 'Basic ' + btoa('b:2') }
  })
  const res = await mw(ctx, Helper.okNext)
  assertEquals(await res?.text(), 'ok')
})

Deno.test('BasicAuth create returns 401 for a Bearer scheme', async () => {
  const mw = Middleware.BasicAuth.create({ users: [{ username: 'u', password: 'p' }] })
  const ctx = Helper.createTestContext('http://localhost/', {
    headers: { Authorization: 'Bearer token' }
  })
  const res = await mw(ctx, Helper.okNext)
  assertEquals(res?.status, 401)
})

Deno.test('BasicAuth create returns 401 for a missing header', async () => {
  const mw = Middleware.BasicAuth.create({ users: [{ username: 'u', password: 'p' }] })
  const ctx = Helper.createTestContext()
  const res = await mw(ctx, Helper.okNext)
  assertEquals(res?.status, 401)
})

Deno.test('BasicAuth create returns 401 for a wrong password', async () => {
  const mw = Middleware.BasicAuth.create({ users: [{ username: 'u', password: 'p' }] })
  const ctx = Helper.createTestContext('http://localhost/', {
    headers: { Authorization: 'Basic ' + btoa('u:wrong') }
  })
  const res = await mw(ctx, Helper.okNext)
  assertEquals(res?.status, 401)
})

Deno.test('BasicAuth create returns 401 for credentials without a colon', async () => {
  const mw = Middleware.BasicAuth.create({ users: [{ username: 'u', password: 'p' }] })
  const ctx = Helper.createTestContext('http://localhost/', {
    headers: { Authorization: 'Basic ' + btoa('nocolon') }
  })
  const res = await mw(ctx, Helper.okNext)
  assertEquals(res?.status, 401)
})

Deno.test('BasicAuth create returns 401 for invalid base64', async () => {
  const mw = Middleware.BasicAuth.create({ users: [{ username: 'u', password: 'p' }] })
  const ctx = Helper.createTestContext('http://localhost/', {
    headers: { Authorization: 'Basic !!!!' }
  })
  const res = await mw(ctx, Helper.okNext)
  assertEquals(res?.status, 401)
})

Deno.test('BasicAuth create sets WWW-Authenticate on a challenge', async () => {
  const mw = Middleware.BasicAuth.create({ users: [{ username: 'u', password: 'p' }] })
  const ctx = Helper.createTestContext()
  const res = await mw(ctx, Helper.okNext)
  assertEquals(res?.headers.get('www-authenticate'), 'Basic realm="Secure Area"')
})

Deno.test('BasicAuth create throws when users array is empty', () => {
  let threw = false
  try {
    Middleware.BasicAuth.create({ users: [] })
  } catch (e) {
    threw = true
    assertEquals(e instanceof Deno.errors.InvalidData, true)
  }
  assertEquals(threw, true)
})
