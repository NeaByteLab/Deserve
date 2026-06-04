import { assertEquals } from '@std/assert'
import { fileURLToPath } from 'node:url'
import * as Rendering from '@rendering/index.ts'

Deno.test('Discover#discoverPaths finds .dve files in directory', async () => {
  const fixtureDir = fileURLToPath(new URL('../fixtures/static/', import.meta.url)).replace(
    /[\\/]$/,
    ''
  )
  const paths = await Rendering.Discover.discoverPaths(fixtureDir)
  assertEquals(paths instanceof Set, true)
})

Deno.test('Discover#discoverPaths finds .dve files in views directory', async () => {
  const viewsDir = fileURLToPath(new URL('../fixtures/views/', import.meta.url)).replace(
    /[\\/]$/,
    ''
  )
  const paths = await Rendering.Discover.discoverPaths(viewsDir)
  assertEquals(paths.size > 0, true)
  let hasHello = false
  for (const p of paths) {
    if (p.endsWith('hello.dve')) {
      hasHello = true
    }
  }
  assertEquals(hasHello, true)
})

Deno.test('Discover#discoverPaths returns empty set for non-existent dir', async () => {
  const paths = await Rendering.Discover.discoverPaths('/nonexistent-dir-' + Date.now())
  assertEquals(paths.size, 0)
})

Deno.test('Discover#discoverPaths returns Set type', async () => {
  const viewsDir = fileURLToPath(new URL('../fixtures/views/', import.meta.url)).replace(
    /[\\/]$/,
    ''
  )
  const paths = await Rendering.Discover.discoverPaths(viewsDir)
  assertEquals(paths instanceof Set, true)
})
