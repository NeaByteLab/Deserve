import { assertEquals, assertThrows } from '@std/assert'
import * as Core from '@core/index.ts'

Deno.test('IpAddress#anyMatch returns false for an empty matcher list', () => {
  assertEquals(Core.IpAddress.anyMatch([], '127.0.0.1'), false)
})

Deno.test('IpAddress#anyMatch returns false when no matcher accepts', () => {
  const matchers = Core.IpAddress.compileRules(['10.0.0.1', '192.168.1.1'])
  assertEquals(Core.IpAddress.anyMatch(matchers, '8.8.8.8'), false)
})

Deno.test('IpAddress#anyMatch returns true when any matcher accepts', () => {
  const matchers = Core.IpAddress.compileRules(['10.0.0.0/8', '192.168.0.1'])
  assertEquals(Core.IpAddress.anyMatch(matchers, '192.168.0.1'), true)
})

Deno.test('IpAddress#anyMatch short-circuits on the first accepting matcher', () => {
  const matchers = Core.IpAddress.compileRules(['*', '10.0.0.1'])
  assertEquals(Core.IpAddress.anyMatch(matchers, 'anything-the-wildcard-accepts'), true)
})

Deno.test('IpAddress#compileRule CIDR /0 matches every address of the same version', () => {
  const matcher = Core.IpAddress.compileRule('0.0.0.0/0')
  assertEquals(matcher('1.2.3.4'), true)
  assertEquals(matcher('255.255.255.255'), true)
})

Deno.test('IpAddress#compileRule CIDR does not match a different version', () => {
  const matcher = Core.IpAddress.compileRule('10.0.0.0/8')
  assertEquals(matcher('::1'), false)
})

Deno.test('IpAddress#compileRule CIDR matches addresses inside the IPv4 range', () => {
  const matcher = Core.IpAddress.compileRule('10.0.0.0/8')
  assertEquals(matcher('10.0.0.1'), true)
  assertEquals(matcher('10.255.255.255'), true)
})

Deno.test('IpAddress#compileRule CIDR rejects addresses outside the IPv4 range', () => {
  const matcher = Core.IpAddress.compileRule('10.0.0.0/8')
  assertEquals(matcher('11.0.0.1'), false)
  assertEquals(matcher('9.255.255.255'), false)
})

Deno.test('IpAddress#compileRule IPv6 CIDR matches inside the prefix', () => {
  const matcher = Core.IpAddress.compileRule('2001:db8::/32')
  assertEquals(matcher('2001:db8::1'), true)
  assertEquals(matcher('2001:db8:ffff::1'), true)
  assertEquals(matcher('2001:db9::1'), false)
})

Deno.test('IpAddress#compileRule exact IPv4 matches only the same address', () => {
  const matcher = Core.IpAddress.compileRule('192.168.1.1')
  assertEquals(matcher('192.168.1.1'), true)
  assertEquals(matcher('192.168.1.2'), false)
})

Deno.test('IpAddress#compileRule exact IPv6 matches its canonical form', () => {
  const matcher = Core.IpAddress.compileRule('2001:db8::1')
  assertEquals(matcher('2001:0db8:0000:0000:0000:0000:0000:0001'), true)
  assertEquals(matcher('2001:db8::2'), false)
})

Deno.test('IpAddress#compileRule exact rule rejects an unparseable target IP', () => {
  const matcher = Core.IpAddress.compileRule('192.168.1.1')
  assertEquals(matcher('not-an-ip'), false)
})

Deno.test('IpAddress#compileRule rejects a CIDR prefix above the IPv4 maximum', () => {
  assertThrows(
    () => Core.IpAddress.compileRule('10.0.0.0/33'),
    Deno.errors.InvalidData,
    'Invalid CIDR prefix'
  )
})

Deno.test('IpAddress#compileRule rejects a CIDR prefix above the IPv6 maximum', () => {
  assertThrows(
    () => Core.IpAddress.compileRule('2001:db8::/129'),
    Deno.errors.InvalidData,
    'Invalid CIDR prefix'
  )
})

Deno.test('IpAddress#compileRule rejects a CIDR with a malformed network', () => {
  assertThrows(
    () => Core.IpAddress.compileRule('999.0.0.0/8'),
    Deno.errors.InvalidData,
    'Invalid CIDR rule'
  )
})

Deno.test('IpAddress#compileRule rejects a CIDR with a non-numeric prefix', () => {
  assertThrows(
    () => Core.IpAddress.compileRule('10.0.0.0/abc'),
    Deno.errors.InvalidData,
    'Invalid CIDR rule'
  )
})

Deno.test('IpAddress#compileRule rejects an empty CIDR prefix', () => {
  assertThrows(
    () => Core.IpAddress.compileRule('10.0.0.0/'),
    Deno.errors.InvalidData,
    'Invalid CIDR rule'
  )
})

Deno.test('IpAddress#compileRule rejects an invalid exact IP rule', () => {
  assertThrows(
    () => Core.IpAddress.compileRule('999.999.999.999'),
    Deno.errors.InvalidData,
    'Invalid IP rule'
  )
})

Deno.test('IpAddress#compileRule wildcard matches any address', () => {
  const matcher = Core.IpAddress.compileRule('*')
  assertEquals(matcher('127.0.0.1'), true)
  assertEquals(matcher('::1'), true)
  assertEquals(matcher('literally-anything'), true)
})

Deno.test('IpAddress#compileRules compiles multiple rules into matchers', () => {
  const matchers = Core.IpAddress.compileRules(['127.0.0.1', '10.0.0.0/8', '*'])
  assertEquals(matchers.length, 3)
})

Deno.test('IpAddress#compileRules propagates a malformed rule as InvalidData', () => {
  assertThrows(
    () => Core.IpAddress.compileRules(['127.0.0.1', 'bad-rule']),
    Deno.errors.InvalidData
  )
})

Deno.test('IpAddress#compileRules returns empty for an empty array', () => {
  assertEquals(Core.IpAddress.compileRules([]), [])
})

Deno.test('IpAddress#compileRules returns empty for undefined', () => {
  assertEquals(Core.IpAddress.compileRules(undefined), [])
})

Deno.test('IpAddress#parse canonicalizes an IPv4-mapped IPv6 address to IPv4', () => {
  const parsed = Core.IpAddress.parse('::ffff:127.0.0.1')
  assertEquals(parsed?.version, 4)
  assertEquals(parsed?.value, 0x7f000001n)
})

Deno.test('IpAddress#parse expands a compressed IPv6 address', () => {
  const full = Core.IpAddress.parse('2001:0db8:0000:0000:0000:0000:0000:0001')
  const compressed = Core.IpAddress.parse('2001:db8::1')
  assertEquals(compressed?.value, full?.value)
  assertEquals(compressed?.version, 6)
})

Deno.test('IpAddress#parse handles all-zero and loopback IPv4 boundaries', () => {
  assertEquals(Core.IpAddress.parse('0.0.0.0')?.value, 0n)
  assertEquals(Core.IpAddress.parse('255.255.255.255')?.value, 0xffffffffn)
})

Deno.test('IpAddress#parse parses a standard IPv4 address', () => {
  const parsed = Core.IpAddress.parse('192.168.0.1')
  assertEquals(parsed?.version, 4)
  assertEquals(parsed?.value, (192n << 24n) | (168n << 16n) | (0n << 8n) | 1n)
})

Deno.test('IpAddress#parse parses an IPv6 address with an embedded IPv4 suffix', () => {
  const embedded = Core.IpAddress.parse('2001:db8::192.168.0.1')
  assertEquals(embedded?.version, 6)
})

Deno.test('IpAddress#parse parses the IPv6 loopback', () => {
  const parsed = Core.IpAddress.parse('::1')
  assertEquals(parsed?.version, 6)
  assertEquals(parsed?.value, 1n)
})

Deno.test('IpAddress#parse rejects IPv4 octets above 255', () => {
  assertEquals(Core.IpAddress.parse('256.0.0.1'), null)
})

Deno.test('IpAddress#parse rejects IPv4 with leading zeros', () => {
  assertEquals(Core.IpAddress.parse('01.0.0.1'), null)
})

Deno.test('IpAddress#parse rejects IPv4 with too few octets', () => {
  assertEquals(Core.IpAddress.parse('1.2.3'), null)
})

Deno.test('IpAddress#parse rejects IPv4 with too many octets', () => {
  assertEquals(Core.IpAddress.parse('1.2.3.4.5'), null)
})

Deno.test('IpAddress#parse rejects IPv6 with a non-hex hextet', () => {
  assertEquals(Core.IpAddress.parse('2001:db8::zzzz'), null)
})

Deno.test('IpAddress#parse rejects IPv6 with an oversized hextet', () => {
  assertEquals(Core.IpAddress.parse('2001:db8::12345'), null)
})

Deno.test('IpAddress#parse rejects IPv6 with more than one double-colon', () => {
  assertEquals(Core.IpAddress.parse('2001::db8::1'), null)
})

Deno.test('IpAddress#parse rejects a fully expanded IPv6 with too many groups', () => {
  assertEquals(Core.IpAddress.parse('1:2:3:4:5:6:7:8:9'), null)
})

Deno.test('IpAddress#parse rejects a non-numeric IPv4 octet', () => {
  assertEquals(Core.IpAddress.parse('1.2.x.4'), null)
})

Deno.test('IpAddress#parse rejects an empty string', () => {
  assertEquals(Core.IpAddress.parse(''), null)
})

Deno.test('IpAddress#parse strips an IPv6 zone identifier before parsing', () => {
  const withZone = Core.IpAddress.parse('fe80::1%eth0')
  const withoutZone = Core.IpAddress.parse('fe80::1')
  assertEquals(withZone?.value, withoutZone?.value)
  assertEquals(withZone?.version, 6)
})
