import { assertEquals } from '@std/assert'
import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'
import * as Routing from '@routing/index.ts'
import { FastRouter } from '@neabyte/fast-router'

const extensions = Core.Constant.allowedExtensions
const methods = Core.Constant.httpMethods

Deno.test('Scanner createPattern builds a route pattern', () => {
  assertEquals(Routing.Scanner.createPattern('users.ts', extensions), '/users')
})

Deno.test('Scanner createPattern collapses index to parent path', () => {
  assertEquals(Routing.Scanner.createPattern('users/index.ts', extensions), '/users')
  assertEquals(Routing.Scanner.createPattern('index.ts', extensions), '/')
})

Deno.test('Scanner createPattern converts bracket params to colon params', () => {
  assertEquals(Routing.Scanner.createPattern('users/[id].ts', extensions), '/users/:id')
})

Deno.test('Scanner createPattern returns null for an unknown extension', () => {
  assertEquals(Routing.Scanner.createPattern('notes.md', extensions), null)
})

Deno.test('Scanner createPattern skips underscore and at segments', () => {
  assertEquals(Routing.Scanner.createPattern('_private.ts', extensions), null)
  assertEquals(Routing.Scanner.createPattern('@layout.ts', extensions), null)
})

Deno.test('Scanner explore skips a non-existent directory without throwing', async () => {
  const router = new FastRouter<Types.RouteEntry>()
  await Routing.Scanner.explore(router, './does-not-exist-routes-xyz', '', methods, extensions)
  assertEquals(router.find('GET', '/anything'), undefined)
})

Deno.test('Scanner registerHandlers registers exported method handlers', () => {
  const router = new FastRouter<Types.RouteEntry>()
  Routing.Scanner.registerHandlers(
    router,
    { GET: () => new Response('ok') } as never,
    '/users',
    methods
  )
  assertEquals(router.find('GET', '/users') !== undefined, true)
  assertEquals(router.find('POST', '/users'), undefined)
})

Deno.test('Scanner validateModule accepts a module with a method export', () => {
  Routing.Scanner.validateModule({ GET: () => new Response('ok') } as never, 'users.ts', methods)
})

Deno.test('Scanner validateModule throws when a method export is not a function', () => {
  let threw = false
  try {
    Routing.Scanner.validateModule({ GET: 'nope' } as never, 'users.ts', methods)
  } catch (e) {
    threw = true
    assertEquals(e instanceof TypeError, true)
  }
  assertEquals(threw, true)
})

Deno.test('Scanner validateModule throws when no method is exported', () => {
  let threw = false
  try {
    Routing.Scanner.validateModule({} as never, 'users.ts', methods)
  } catch (e) {
    threw = true
    assertEquals(e instanceof Deno.errors.InvalidData, true)
  }
  assertEquals(threw, true)
})
