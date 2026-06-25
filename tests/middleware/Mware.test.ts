import { assertEquals } from '@std/assert'
import * as Middleware from '@middleware/index.ts'

Deno.test('Mware basicAuth builds a middleware function', () => {
  const mw = Middleware.Mware.basicAuth({ users: [{ username: 'u', password: 'p' }] })
  assertEquals(typeof mw, 'function')
})

Deno.test('Mware bodyLimit builds a middleware function', () => {
  const mw = Middleware.Mware.bodyLimit({ limit: 100 })
  assertEquals(typeof mw, 'function')
})

Deno.test('Mware cors builds a middleware function', () => {
  assertEquals(typeof Middleware.Mware.cors(), 'function')
})

Deno.test('Mware csrf builds a middleware function', () => {
  assertEquals(typeof Middleware.Mware.csrf(), 'function')
})

Deno.test('Mware exposes built-in middleware factories', () => {
  assertEquals(typeof Middleware.Mware.basicAuth, 'function')
  assertEquals(typeof Middleware.Mware.bodyLimit, 'function')
  assertEquals(typeof Middleware.Mware.cors, 'function')
  assertEquals(typeof Middleware.Mware.csrf, 'function')
  assertEquals(typeof Middleware.Mware.ip, 'function')
  assertEquals(typeof Middleware.Mware.securityHeaders, 'function')
  assertEquals(typeof Middleware.Mware.session, 'function')
  assertEquals(typeof Middleware.Mware.websocket, 'function')
})

Deno.test('Mware ip builds a middleware function', () => {
  assertEquals(typeof Middleware.Mware.ip(), 'function')
})

Deno.test('Mware securityHeaders builds a middleware function', () => {
  assertEquals(typeof Middleware.Mware.securityHeaders(), 'function')
})

Deno.test('Mware session builds a middleware function', () => {
  const mw = Middleware.Mware.session({ secret: 'x'.repeat(32) })
  assertEquals(typeof mw, 'function')
})

Deno.test('Mware websocket builds a middleware function', () => {
  assertEquals(typeof Middleware.Mware.websocket(), 'function')
})
