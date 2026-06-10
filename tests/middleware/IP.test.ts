import type * as Types from '@interfaces/index.ts'
import { assertEquals } from '@std/assert'
import * as Core from '@core/index.ts'
import * as Middleware from '@middleware/index.ts'

function createTestContext(ip?: string): Core.Context {
  const url = 'http://localhost/'
  const request = new Request(url)
  return new Core.Context(request, new URL(url), {}, undefined, ip)
}

async function run(middleware: Types.MiddlewareFn, ip?: string): Promise<number> {
  const ctx = createTestContext(ip)
  const res = await middleware(ctx, async () => new Response('ok'))
  return res === undefined ? 200 : res.status
}

Deno.test('context directIp falls back to client ip when peer omitted', () => {
  const url = 'http://localhost/'
  const ctx = new Core.Context(new Request(url), new URL(url), {}, undefined, '203.0.113.42')
  assertEquals(ctx.directIp, '203.0.113.42')
})

Deno.test('context exposes resolved ip and direct peer separately', () => {
  const url = 'http://localhost/'
  const ctx = new Core.Context(
    new Request(url),
    new URL(url),
    {},
    undefined,
    '203.0.113.42',
    '127.0.0.1'
  )
  assertEquals(ctx.ip, '203.0.113.42')
  assertEquals(ctx.directIp, '127.0.0.1')
})

Deno.test('ip CIDR IPv4 /0 matches all addresses', async () => {
  const mw = Middleware.Mware.ip({ whitelist: ['0.0.0.0/0'] })
  assertEquals(await run(mw, '8.8.8.8'), 200)
})

Deno.test('ip CIDR IPv4 /24 matches inside and rejects outside', async () => {
  const mw = Middleware.Mware.ip({ whitelist: ['192.168.1.0/24'] })
  assertEquals(await run(mw, '192.168.1.55'), 200)
  assertEquals(await run(mw, '192.168.2.55'), 403)
})

Deno.test('ip CIDR IPv4 /32 matches only the exact host', async () => {
  const mw = Middleware.Mware.ip({ whitelist: ['1.2.3.4/32'] })
  assertEquals(await run(mw, '1.2.3.4'), 200)
  assertEquals(await run(mw, '1.2.3.5'), 403)
})

Deno.test('ip CIDR IPv4 rule matches an IPv4-mapped IPv6 client', async () => {
  const mw = Middleware.Mware.ip({ whitelist: ['127.0.0.0/8'] })
  assertEquals(await run(mw, '::ffff:127.0.0.55'), 200)
  assertEquals(await run(mw, '::ffff:10.0.0.1'), 403)
})

Deno.test('ip CIDR IPv6 /128 matches only the exact host', async () => {
  const mw = Middleware.Mware.ip({ whitelist: ['::1/128'] })
  assertEquals(await run(mw, '::1'), 200)
  assertEquals(await run(mw, '::2'), 403)
})

Deno.test('ip CIDR IPv6 prefix matches inside and rejects outside', async () => {
  const mw = Middleware.Mware.ip({ whitelist: ['2001:db8::/32'] })
  assertEquals(await run(mw, '2001:db8:1234::1'), 200)
  assertEquals(await run(mw, '2001:db9::1'), 403)
})

Deno.test('ip blacklist blocks an IPv4-mapped IPv6 client (no bypass)', async () => {
  const mw = Middleware.Mware.ip({ blacklist: ['127.0.0.1'] })
  assertEquals(await run(mw, '127.0.0.1'), 403)
  assertEquals(await run(mw, '::ffff:127.0.0.1'), 403)
  assertEquals(await run(mw, '::ffff:7f00:1'), 403)
})

Deno.test('ip blacklist blocks the resolved client behind a trusted proxy', async () => {
  const tester = Core.IpResolver.compile(['loopback'])
  const resolved = Core.IpResolver.resolve(
    '127.0.0.1',
    new Headers({ 'x-forwarded-for': '203.0.113.42' }),
    tester
  )
  const mw = Middleware.Mware.ip({ blacklist: ['203.0.113.42'] })
  assertEquals(await run(mw, resolved), 403)
})

Deno.test('ip blacklist cannot be bypassed by spoofed XFF from an untrusted peer', async () => {
  const tester = Core.IpResolver.compile(['loopback'])
  const resolved = Core.IpResolver.resolve(
    '203.0.113.42',
    new Headers({ 'x-forwarded-for': '8.8.8.8' }),
    tester
  )
  const mw = Middleware.Mware.ip({ blacklist: ['203.0.113.42'] })
  assertEquals(await run(mw, resolved), 403)
})

Deno.test('ip blacklist denies a listed IPv4 and allows others', async () => {
  const mw = Middleware.Mware.ip({ blacklist: ['192.168.1.10'] })
  assertEquals(await run(mw, '192.168.1.10'), 403)
  assertEquals(await run(mw, '192.168.1.11'), 200)
})

Deno.test('ip denies when connection IP is unavailable (fail-safe)', async () => {
  const mw = Middleware.Mware.ip({ whitelist: ['127.0.0.1'] })
  assertEquals(await run(mw, undefined), 403)
})

Deno.test('ip does not cross-match IPv4 against IPv6 rule', async () => {
  const mw = Middleware.Mware.ip({ whitelist: ['::1'] })
  assertEquals(await run(mw, '127.0.0.1'), 403)
})

Deno.test('ip exact IPv6 matches', async () => {
  const mw = Middleware.Mware.ip({ whitelist: ['::1'] })
  assertEquals(await run(mw, '::1'), 200)
  assertEquals(await run(mw, '::2'), 403)
})

Deno.test('ip keeps real IPv6 matching intact after mapped canonicalization', async () => {
  const mw = Middleware.Mware.ip({ whitelist: ['2001:db8::/32'] })
  assertEquals(await run(mw, '2001:db8:1234::1'), 200)
  assertEquals(await run(mw, '2001:db9::1'), 403)
  assertEquals(await run(mw, '::ffff:127.0.0.1'), 403)
})

Deno.test('ip rejects zero-padded ambiguous octets', async () => {
  const mw = Middleware.Mware.ip({ whitelist: ['127.0.0.1'] })
  assertEquals(await run(mw, '127.0.0.01'), 403)
  assertEquals(await run(mw, '127.000.000.001'), 403)
})

Deno.test('ip throws on a zero-padded octet in a rule', () => {
  let thrown = false
  try {
    Middleware.Mware.ip({ whitelist: ['010.0.0.1'] })
  } catch (e) {
    thrown = true
    assertEquals(e instanceof Deno.errors.InvalidData, true)
  }
  assertEquals(thrown, true)
})

Deno.test('ip throws on malformed exact rule', () => {
  let thrown = false
  try {
    Middleware.Mware.ip({ whitelist: ['999.0.0.1'] })
  } catch (e) {
    thrown = true
    assertEquals(e instanceof Deno.errors.InvalidData, true)
  }
  assertEquals(thrown, true)
})

Deno.test('ip throws on out-of-range CIDR prefix', () => {
  let thrown = false
  try {
    Middleware.Mware.ip({ whitelist: ['1.2.3.4/33'] })
  } catch (e) {
    thrown = true
    assertEquals(e instanceof Deno.errors.InvalidData, true)
  }
  assertEquals(thrown, true)
})

Deno.test('ip throws on out-of-range IPv6 CIDR prefix', () => {
  let thrown = false
  try {
    Middleware.Mware.ip({ blacklist: ['::1/129'] })
  } catch {
    thrown = true
  }
  assertEquals(thrown, true)
})

Deno.test('ip whitelist allows a listed exact IPv4', async () => {
  const mw = Middleware.Mware.ip({ whitelist: ['127.0.0.1'] })
  assertEquals(await run(mw, '127.0.0.1'), 200)
})

Deno.test('ip whitelist allows an IPv4-mapped IPv6 client (no false deny)', async () => {
  const mw = Middleware.Mware.ip({ whitelist: ['127.0.0.1'] })
  assertEquals(await run(mw, '::ffff:127.0.0.1'), 200)
})

Deno.test('ip whitelist cannot be entered by spoofed XFF from an untrusted peer', async () => {
  const tester = Core.IpResolver.compile(['loopback'])
  const resolved = Core.IpResolver.resolve(
    '198.51.100.7',
    new Headers({ 'x-forwarded-for': '203.0.113.42' }),
    tester
  )
  const mw = Middleware.Mware.ip({ whitelist: ['203.0.113.42'] })
  assertEquals(await run(mw, resolved), 403)
})

Deno.test('ip whitelist denies an unlisted IPv4', async () => {
  const mw = Middleware.Mware.ip({ whitelist: ['127.0.0.1'] })
  assertEquals(await run(mw, '10.0.0.5'), 403)
})

Deno.test('ip whitelist takes precedence over blacklist', async () => {
  const mw = Middleware.Mware.ip({ whitelist: ['10.0.0.1'], blacklist: ['10.0.0.1'] })
  assertEquals(await run(mw, '10.0.0.1'), 200)
  assertEquals(await run(mw, '10.0.0.2'), 403)
})

Deno.test('ip wildcard in blacklist denies everything', async () => {
  const mw = Middleware.Mware.ip({ blacklist: ['*'] })
  assertEquals(await run(mw, '203.0.113.7'), 403)
})

Deno.test('ip wildcard in whitelist allows everything', async () => {
  const mw = Middleware.Mware.ip({ whitelist: ['*'] })
  assertEquals(await run(mw, '203.0.113.7'), 200)
  assertEquals(await run(mw, '::1'), 200)
})

Deno.test('ip with empty options allows any IP', async () => {
  const mw = Middleware.Mware.ip({})
  assertEquals(await run(mw, '203.0.113.7'), 200)
})
