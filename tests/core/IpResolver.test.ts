import { assertEquals } from '@std/assert'
import * as Core from '@core/index.ts'

function resolve(
  config: Parameters<typeof Core.IpResolver.compile>[0],
  peer: string | undefined,
  headers: Record<string, string>
): string | undefined {
  const tester = Core.IpResolver.compile(config)
  return Core.IpResolver.resolve(peer, new Headers(headers), tester)
}

Deno.test('resolve canonicalizes mapped-IPv6 peer before trust check', () => {
  assertEquals(
    resolve(['127.0.0.1'], '::ffff:127.0.0.1', { 'x-forwarded-for': '203.0.113.42' }),
    '203.0.113.42'
  )
})

Deno.test('resolve discards spoofed XFF when peer is untrusted', () => {
  assertEquals(
    resolve(['127.0.0.1'], '203.0.113.9', { 'x-forwarded-for': '127.0.0.1' }),
    '203.0.113.9'
  )
})

Deno.test('resolve falls back to peer when XFF holds only invalid tokens', () => {
  assertEquals(
    resolve(['loopback'], '127.0.0.1', { 'x-forwarded-for': 'not-an-ip' }),
    '127.0.0.1'
  )
})

Deno.test('resolve honors CF-Connecting-IP behind trusted peer', () => {
  assertEquals(
    resolve(['loopback'], '127.0.0.1', { 'cf-connecting-ip': '203.0.113.42' }),
    '203.0.113.42'
  )
})

Deno.test('resolve honors X-Real-IP behind trusted peer', () => {
  assertEquals(
    resolve(['loopback'], '127.0.0.1', { 'x-real-ip': '198.51.100.7' }),
    '198.51.100.7'
  )
})

Deno.test('resolve honors loopback preset', () => {
  assertEquals(
    resolve(['loopback'], '127.0.0.5', { 'x-forwarded-for': '203.0.113.42' }),
    '203.0.113.42'
  )
})

Deno.test('resolve honors uniquelocal preset', () => {
  assertEquals(
    resolve(['uniquelocal'], '192.168.1.1', { 'x-forwarded-for': '8.8.8.8' }),
    '8.8.8.8'
  )
})

Deno.test('resolve ignores single-IP header when peer untrusted', () => {
  assertEquals(
    resolve(['loopback'], '203.0.113.9', { 'cf-connecting-ip': '1.2.3.4' }),
    '203.0.113.9'
  )
})

Deno.test('resolve parses RFC 7239 Forwarded for IPv4', () => {
  assertEquals(
    resolve(['loopback'], '127.0.0.1', { forwarded: 'for=203.0.113.42;proto=https' }),
    '203.0.113.42'
  )
})

Deno.test('resolve parses RFC 7239 Forwarded for IPv6 with port', () => {
  assertEquals(
    resolve(['loopback'], '127.0.0.1', { forwarded: 'for="[2001:db8::1]:443"' }),
    '2001:db8::1'
  )
})

Deno.test('resolve returns undefined when peer is unknown', () => {
  assertEquals(
    resolve(['loopback'], undefined, { 'x-forwarded-for': '203.0.113.42' }),
    undefined
  )
})

Deno.test('resolve stops at nearest untrusted proxy', () => {
  assertEquals(
    resolve(['10.0.0.2'], '10.0.0.2', {
      'x-forwarded-for': '203.0.113.42, 10.0.0.1'
    }),
    '10.0.0.1'
  )
})

Deno.test('resolve strips port from plain IPv4 XFF token', () => {
  assertEquals(
    resolve(['loopback'], '127.0.0.1', { 'x-forwarded-for': '203.0.113.42:51234' }),
    '203.0.113.42'
  )
})

Deno.test('resolve supports predicate trust config', () => {
  assertEquals(
    resolve((ip) => ip === '127.0.0.1', '127.0.0.1', { 'x-forwarded-for': '203.0.113.42' }),
    '203.0.113.42'
  )
})

Deno.test('resolve trusts XFF when peer is a trusted proxy', () => {
  assertEquals(
    resolve(['127.0.0.1'], '127.0.0.1', { 'x-forwarded-for': '203.0.113.42' }),
    '203.0.113.42'
  )
})

Deno.test('resolve walks right-to-left to first untrusted hop', () => {
  assertEquals(
    resolve(['10.0.0.0/8'], '10.0.0.2', {
      'x-forwarded-for': '203.0.113.42, 10.0.0.1'
    }),
    '203.0.113.42'
  )
})

Deno.test('resolve with empty trust list ignores forwarded headers', () => {
  assertEquals(
    resolve([], '203.0.113.9', { 'x-forwarded-for': '1.2.3.4' }),
    '203.0.113.9'
  )
})

Deno.test('resolve without trustProxy ignores forwarded headers', () => {
  assertEquals(
    resolve(undefined, '203.0.113.9', { 'x-forwarded-for': '1.2.3.4' }),
    '203.0.113.9'
  )
})
