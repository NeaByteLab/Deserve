import { assertEquals } from '@std/assert'
import * as Core from '@core/index.ts'
import * as Middleware from '@middleware/index.ts'
import Helper from '@tests/helper.ts'

function ctxWithIp(ip: string | undefined): Core.Context {
  const request = new Request('http://localhost/')
  return new Core.Context(request, new URL('http://localhost/'), null, ip, ip, null, () => {})
}

Deno.test('IP create allows a non-blacklisted client', async () => {
  const mw = Middleware.IP.create({ blacklist: ['8.8.8.8'] })
  const res = await mw(ctxWithIp('1.1.1.1'), Helper.okNext)
  assertEquals(await res?.text(), 'ok')
})

Deno.test('IP create allows a whitelisted client', async () => {
  const mw = Middleware.IP.create({ whitelist: ['10.0.0.0/8'] })
  const res = await mw(ctxWithIp('10.1.2.3'), Helper.okNext)
  assertEquals(await res?.text(), 'ok')
})

Deno.test('IP create returns 403 for a blacklisted client', async () => {
  const mw = Middleware.IP.create({ blacklist: ['8.8.8.8'] })
  const res = await mw(ctxWithIp('8.8.8.8'), Helper.okNext)
  assertEquals(res?.status, 403)
})

Deno.test('IP create returns 403 for a non-whitelisted client', async () => {
  const mw = Middleware.IP.create({ whitelist: ['10.0.0.0/8'] })
  const res = await mw(ctxWithIp('8.8.8.8'), Helper.okNext)
  assertEquals(res?.status, 403)
})

Deno.test('IP create returns 403 when client IP is unknown', async () => {
  const mw = Middleware.IP.create({ whitelist: ['10.0.0.0/8'] })
  const res = await mw(ctxWithIp(undefined), Helper.okNext)
  assertEquals(res?.status, 403)
})

Deno.test('IP create with no rules allows any client', async () => {
  const mw = Middleware.IP.create()
  const res = await mw(ctxWithIp('203.0.113.1'), Helper.okNext)
  assertEquals(await res?.text(), 'ok')
})
