import { assertEquals } from '@std/assert'
import * as Routing from '@routing/index.ts'

Deno.test('Watcher watch returns a callable disposer for a real directory', () => {
  const handler = new Routing.Handler()
  const stop = Routing.Watcher.watch(handler, './tests/fixtures')
  assertEquals(typeof stop, 'function')
  stop()
})

Deno.test('Watcher watch returns a noop disposer for a missing directory', () => {
  const handler = new Routing.Handler()
  const stop = Routing.Watcher.watch(handler, './does-not-exist-routes-xyz')
  assertEquals(typeof stop, 'function')
  stop()
})

Deno.test('Watcher watch skips a non-existent directory without throwing', () => {
  const handler = new Routing.Handler()
  Routing.Watcher.watch(handler, './does-not-exist-routes-xyz')
  assertEquals(true, true)
})
