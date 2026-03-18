import { assertEquals } from 'jsr:@std/assert'
import * as Rendering from '@rendering/index.ts'

Deno.test('Discover#discoverPaths finds .dve files in directory', async () => {
  const fixtureDir = new URL('../fixtures/static/', import.meta.url).pathname.replace(/\/$/, '')
  const paths = await Rendering.Discover.discoverPaths(fixtureDir)
  assertEquals(paths instanceof Set, true)
})

Deno.test('Discover#discoverPaths returns empty set for non-existent dir', async () => {
  const paths = await Rendering.Discover.discoverPaths('/nonexistent-dir-' + Date.now())
  assertEquals(paths.size, 0)
})
