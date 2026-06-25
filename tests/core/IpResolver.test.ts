import { assertEquals } from '@std/assert'
import * as Core from '@core/index.ts'

Deno.test('IpResolver compile expands loopback preset', () => {
  const matcher = Core.IpResolver.compile(['loopback'])
  assertEquals(matcher?.('127.0.0.1'), true)
  assertEquals(matcher?.('::1'), true)
  assertEquals(matcher?.('8.8.8.8'), false)
})

Deno.test('IpResolver compile passes through a function config', () => {
  const fn = (ip: string) => ip === '1.2.3.4'
  assertEquals(Core.IpResolver.compile(fn), fn)
})

Deno.test('IpResolver compile returns null for empty config', () => {
  assertEquals(Core.IpResolver.compile([]), null)
})

Deno.test('IpResolver compile returns null for undefined config', () => {
  assertEquals(Core.IpResolver.compile(undefined), null)
})

Deno.test('IpResolver resolve reads x-real-ip behind trusted proxy', () => {
  const trust = Core.IpResolver.compile(['loopback'])
  const headers = new Headers({ 'x-real-ip': '203.0.113.5' })
  assertEquals(Core.IpResolver.resolve('127.0.0.1', headers, trust), '203.0.113.5')
})

Deno.test('IpResolver resolve returns direct peer when no forwarded headers', () => {
  const trust = Core.IpResolver.compile(['loopback'])
  assertEquals(Core.IpResolver.resolve('127.0.0.1', new Headers(), trust), '127.0.0.1')
})

Deno.test('IpResolver resolve returns direct peer when not trusted', () => {
  const trust = Core.IpResolver.compile(['loopback'])
  const headers = new Headers({ 'x-forwarded-for': '1.2.3.4' })
  assertEquals(Core.IpResolver.resolve('8.8.8.8', headers, trust), '8.8.8.8')
})

Deno.test('IpResolver resolve returns direct peer with null trust', () => {
  const headers = new Headers({ 'x-forwarded-for': '1.2.3.4' })
  assertEquals(Core.IpResolver.resolve('9.9.9.9', headers, null), '9.9.9.9')
})

Deno.test('IpResolver resolve walks forwarded chain skipping trusted hops', () => {
  const trust = Core.IpResolver.compile(['loopback'])
  const headers = new Headers({ 'x-forwarded-for': '203.0.113.7, 127.0.0.1' })
  assertEquals(Core.IpResolver.resolve('127.0.0.1', headers, trust), '203.0.113.7')
})
