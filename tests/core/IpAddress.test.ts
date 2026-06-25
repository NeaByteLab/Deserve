import { assertEquals } from '@std/assert'
import * as Core from '@core/index.ts'

Deno.test('IpAddress anyMatch returns true on a matcher hit', () => {
  const matchers = Core.IpAddress.compileRules(['10.0.0.0/8', '192.168.0.0/16'])
  assertEquals(Core.IpAddress.anyMatch(matchers, '192.168.1.1'), true)
  assertEquals(Core.IpAddress.anyMatch(matchers, '8.8.8.8'), false)
})

Deno.test('IpAddress compileRule CIDR match', () => {
  const matcher = Core.IpAddress.compileRule('10.0.0.0/8')
  assertEquals(matcher('10.1.2.3'), true)
  assertEquals(matcher('11.0.0.1'), false)
})

Deno.test('IpAddress compileRule exact match', () => {
  const matcher = Core.IpAddress.compileRule('10.0.0.1')
  assertEquals(matcher('10.0.0.1'), true)
  assertEquals(matcher('10.0.0.2'), false)
})

Deno.test('IpAddress compileRule throws on invalid CIDR prefix', () => {
  let threw = false
  try {
    Core.IpAddress.compileRule('10.0.0.0/40')
  } catch (e) {
    threw = true
    assertEquals(e instanceof Deno.errors.InvalidData, true)
  }
  assertEquals(threw, true)
})

Deno.test('IpAddress compileRule throws on invalid rule', () => {
  let threw = false
  try {
    Core.IpAddress.compileRule('999.0.0.1')
  } catch (e) {
    threw = true
    assertEquals(e instanceof Deno.errors.InvalidData, true)
  }
  assertEquals(threw, true)
})

Deno.test('IpAddress compileRule wildcard matches everything', () => {
  const matcher = Core.IpAddress.compileRule('*')
  assertEquals(matcher('1.2.3.4'), true)
  assertEquals(matcher('::1'), true)
})

Deno.test('IpAddress compileRules returns empty for no rules', () => {
  assertEquals(Core.IpAddress.compileRules(undefined).length, 0)
  assertEquals(Core.IpAddress.compileRules([]).length, 0)
})

Deno.test('IpAddress isValid accepts IPv4 and IPv6', () => {
  assertEquals(Core.IpAddress.isValid('192.168.0.1'), true)
  assertEquals(Core.IpAddress.isValid('::1'), true)
})

Deno.test('IpAddress isValid rejects malformed addresses', () => {
  assertEquals(Core.IpAddress.isValid('256.0.0.1'), false)
  assertEquals(Core.IpAddress.isValid('not-an-ip'), false)
  assertEquals(Core.IpAddress.isValid(''), false)
})

Deno.test('IpAddress parse maps IPv4-in-IPv6 to version four', () => {
  const parsed = Core.IpAddress.parse('::ffff:192.168.0.1')
  assertEquals(parsed?.version, 4)
})

Deno.test('IpAddress parse returns version six for IPv6', () => {
  const parsed = Core.IpAddress.parse('2001:db8::1')
  assertEquals(parsed?.version, 6)
})
