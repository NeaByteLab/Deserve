import { assertEquals, assertThrows } from '@std/assert'
import * as Core from '@core/index.ts'
import * as Routing from '@routing/index.ts'
import * as Middleware from '@middleware/index.ts'

Deno.test('Hardening a Router instance cannot be monkey-patched', () => {
  const app = new Routing.Router({ routesDir: './routes' })
  const target = app as unknown as Record<string, unknown>
  assertThrows(() => {
    target['serve'] = () => {}
  }, TypeError)
  assertThrows(() => {
    target['use'] = () => {}
  }, TypeError)
  assertThrows(() => {
    target['backdoor'] = 1
  }, TypeError)
  assertEquals(Object.isFrozen(app), true)
})

Deno.test('Hardening keeps the Context internal channel per-instance', () => {
  const first = new Core.Context(
    new Request('http://localhost/a'),
    new URL('http://localhost/a'),
    {},
    undefined,
    '1.1.1.1'
  )
  const second = new Core.Context(
    new Request('http://localhost/b'),
    new URL('http://localhost/b'),
    {},
    undefined,
    '2.2.2.2'
  )
  first.setHeader('X-A', '1')
  second.setHeader('X-B', '2')
  const firstChannel = first[Core.InternalContext]
  const secondChannel = second[Core.InternalContext]
  assertEquals(firstChannel === secondChannel, false)
  assertEquals(firstChannel.responseHeadersMap['X-A'], '1')
  assertEquals(secondChannel.responseHeadersMap['X-B'], '2')
  assertEquals('X-A' in secondChannel.responseHeadersMap, false)
})

Deno.test('Hardening preserves legitimate use of the sealed surface', () => {
  const app = new Routing.Router({ routesDir: './routes' })
  assertEquals(typeof app.use, 'function')
  assertEquals(typeof app.serve, 'function')
  assertEquals(typeof Middleware.Mware.cors(), 'function')
})

Deno.test('Hardening the Context prototype cannot be monkey-patched', () => {
  const proto = Core.Context.prototype as unknown as Record<string, unknown>
  assertThrows(() => {
    proto['json'] = () => 'evil'
  }, TypeError)
  assertEquals(Object.isFrozen(Core.Context.prototype), true)
})

Deno.test('Hardening the Mware factory dictionary cannot be monkey-patched', () => {
  const target = Middleware.Mware as unknown as Record<string, unknown>
  assertThrows(() => {
    target['cors'] = () => {}
  }, TypeError)
  assertThrows(() => {
    target['evil'] = () => {}
  }, TypeError)
  assertEquals(Object.isFrozen(Middleware.Mware), true)
})

Deno.test('Hardening the Router prototype cannot be monkey-patched', () => {
  const proto = Routing.Router.prototype as unknown as Record<string, unknown>
  assertThrows(() => {
    proto['serve'] = () => {}
  }, TypeError)
  assertEquals(Object.isFrozen(Routing.Router.prototype), true)
})
