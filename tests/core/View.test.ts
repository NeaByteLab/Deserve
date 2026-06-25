import { assertEquals } from '@std/assert'
import { fileURLToPath } from 'node:url'
import * as Core from '@core/index.ts'

const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(/[/\\]$/, '')

Deno.test('View watch returns a callable disposer for a real directory', () => {
  const engine = new Core.Rendering({ directory: viewsDir })
  const stop = Core.View.watch(engine)
  assertEquals(typeof stop, 'function')
  stop()
})

Deno.test('View watch returns a noop disposer for a missing directory', () => {
  const engine = new Core.Rendering({ directory: './does-not-exist-views-xyz' })
  const stop = Core.View.watch(engine)
  assertEquals(typeof stop, 'function')
  stop()
})
