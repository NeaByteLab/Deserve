import type * as Types from '@interfaces/index.ts'
import { assertEquals } from '@std/assert'
import * as Core from '@core/index.ts'
import * as Routing from '@routing/index.ts'
import { FastRouter } from '@neabyte/fast-router'

Deno.test('Scanner#createPattern [id] to :id', () => {
  const ext = Core.Constant.allowedExtensions
  assertEquals(Routing.Scanner.createPattern('items/[id].ts', ext), '/items/:id')
  assertEquals(Routing.Scanner.createPattern('users/[id]/edit.tsx', ext), '/users/:id/edit')
})

Deno.test('Scanner#createPattern accepts single-dot filenames', () => {
  assertEquals(Routing.Scanner.createPattern('users.ts', ['ts', 'js']), '/users')
  assertEquals(Routing.Scanner.createPattern('api/index.ts', ['ts', 'js']), '/api')
})

Deno.test('Scanner#createPattern case-insensitive index detection', () => {
  const ext = Core.Constant.allowedExtensions
  assertEquals(Routing.Scanner.createPattern('INDEX.TS', ext), '/')
})

Deno.test('Scanner#createPattern index to /', () => {
  const ext = Core.Constant.allowedExtensions
  assertEquals(Routing.Scanner.createPattern('index.ts', ext), '/')
  assertEquals(Routing.Scanner.createPattern('items/index.ts', ext), '/items')
})

Deno.test('Scanner#createPattern invalid extension returns null', () => {
  const ext = Core.Constant.allowedExtensions
  assertEquals(Routing.Scanner.createPattern('readme.md', ext), null)
})

Deno.test('Scanner#createPattern nested deep path', () => {
  const ext = Core.Constant.allowedExtensions
  assertEquals(
    Routing.Scanner.createPattern('api/v1/users/[id]/posts/[postId].ts', ext),
    '/api/v1/users/:id/posts/:postId'
  )
})

Deno.test('Scanner#createPattern rejects invalid last segment chars', () => {
  const ext = Core.Constant.allowedExtensions
  assertEquals(Routing.Scanner.createPattern('users/na me.ts', ext), null)
  assertEquals(Routing.Scanner.createPattern('users/na?me.ts', ext), null)
})

Deno.test('Scanner#createPattern rejects multi-dot filenames', () => {
  assertEquals(Routing.Scanner.createPattern('users.test.ts', ['ts', 'js']), null)
  assertEquals(Routing.Scanner.createPattern('config.local.ts', ['ts', 'js']), null)
  assertEquals(Routing.Scanner.createPattern('api.spec.js', ['ts', 'js']), null)
})

Deno.test('Scanner#createPattern skips _ and @ segments', () => {
  const ext = Core.Constant.allowedExtensions
  assertEquals(Routing.Scanner.createPattern('_layout.ts', ext), null)
  assertEquals(Routing.Scanner.createPattern('@components/foo.ts', ext), null)
})

Deno.test('Scanner#createPattern with .cjs extension', () => {
  const ext = Core.Constant.allowedExtensions
  assertEquals(Routing.Scanner.createPattern('items/create.cjs', ext), '/items/create')
})

Deno.test('Scanner#createPattern with .js extension', () => {
  const ext = Core.Constant.allowedExtensions
  assertEquals(Routing.Scanner.createPattern('items/create.js', ext), '/items/create')
})

Deno.test('Scanner#createPattern with .jsx extension', () => {
  const ext = Core.Constant.allowedExtensions
  assertEquals(Routing.Scanner.createPattern('items/create.jsx', ext), '/items/create')
})

Deno.test('Scanner#createPattern with .mjs extension', () => {
  const ext = Core.Constant.allowedExtensions
  assertEquals(Routing.Scanner.createPattern('items/create.mjs', ext), '/items/create')
})

Deno.test('Scanner#createPattern with .tsx extension', () => {
  const ext = Core.Constant.allowedExtensions
  assertEquals(Routing.Scanner.createPattern('items/create.tsx', ext), '/items/create')
})

Deno.test('Scanner#createPattern with empty string returns null', () => {
  const ext = Core.Constant.allowedExtensions
  assertEquals(Routing.Scanner.createPattern('', ext), null)
})

Deno.test('Scanner#createPattern with hyphen in name', () => {
  const ext = Core.Constant.allowedExtensions
  assertEquals(Routing.Scanner.createPattern('items/my-file.ts', ext), '/items/my-file')
})

Deno.test('Scanner#createPattern with multiple segments and param', () => {
  const ext = Core.Constant.allowedExtensions
  assertEquals(
    Routing.Scanner.createPattern('api/users/[userId]/posts.ts', ext),
    '/api/users/:userId/posts'
  )
})

Deno.test('Scanner#createPattern with no extension returns null', () => {
  const ext = Core.Constant.allowedExtensions
  assertEquals(Routing.Scanner.createPattern('Makefile', ext), null)
})

Deno.test('Scanner#createPattern with tilde and plus in name', () => {
  const ext = Core.Constant.allowedExtensions
  assertEquals(Routing.Scanner.createPattern('items/my~file.ts', ext), '/items/my~file')
  assertEquals(Routing.Scanner.createPattern('items/my+file.ts', ext), '/items/my+file')
})

Deno.test('Scanner#registerHandlers adds function exports to router', () => {
  const router = new FastRouter<Types.RouteEntry>()
  const getHandler = () => new Response('get')
  const postHandler = () => new Response('post')
  Routing.Scanner.registerHandlers(
    router,
    { GET: getHandler, POST: postHandler },
    '/items',
    Core.Constant.httpMethods
  )
  const getResult = router.find('GET', '/items')
  assertEquals(getResult !== null, true)
  const postResult = router.find('POST', '/items')
  assertEquals(postResult !== null, true)
})

Deno.test('Scanner#registerHandlers skips non-function exports', () => {
  const router = new FastRouter<Types.RouteEntry>()
  Routing.Scanner.registerHandlers(
    router,
    { GET: () => new Response('ok'), config: { timeout: 5000 } },
    '/items',
    Core.Constant.httpMethods
  )
  const getResult = router.find('GET', '/items')
  assertEquals(getResult !== null, true)
})

Deno.test('Scanner#registerHandlers with empty module adds nothing', () => {
  const router = new FastRouter<Types.RouteEntry>()
  Routing.Scanner.registerHandlers(router, {}, '/items', Core.Constant.httpMethods)
  const result = router.find('GET', '/items')
  assertEquals(result == null, true)
})

Deno.test('Scanner#validateModule throws Deno.errors.InvalidData for no method', () => {
  let caughtError: unknown = null
  try {
    Routing.Scanner.validateModule({ foo: 1 }, 'routes/foo.ts', Core.Constant.httpMethods)
  } catch (e) {
    caughtError = e
  }
  assertEquals(caughtError instanceof Deno.errors.InvalidData, true)
})

Deno.test('Scanner#validateModule throws TypeError for non-function method', () => {
  let caughtError: unknown = null
  try {
    Routing.Scanner.validateModule({ GET: 123 }, 'routes/foo.ts', Core.Constant.httpMethods)
  } catch (e) {
    caughtError = e
  }
  assertEquals(caughtError instanceof TypeError, true)
})

Deno.test('Scanner#validateModule throws when method export not function', () => {
  let thrown = false
  try {
    Routing.Scanner.validateModule({ GET: 123 }, 'routes/foo.ts', Core.Constant.httpMethods)
  } catch (e) {
    thrown = true
    assertEquals((e as Error).message.includes('must be a function'), true)
  }
  assertEquals(thrown, true)
})

Deno.test('Scanner#validateModule throws when no method exported', () => {
  let thrown = false
  try {
    Routing.Scanner.validateModule({ foo: 1 }, 'routes/foo.ts', Core.Constant.httpMethods)
  } catch (e) {
    thrown = true
    assertEquals((e as Error).message.includes('must export at least one HTTP method'), true)
  }
  assertEquals(thrown, true)
})

Deno.test('Scanner#validateModule throws when non-function method alongside valid', () => {
  let thrown = false
  try {
    Routing.Scanner.validateModule(
      { GET: () => {}, POST: 'not-a-function' },
      'routes/items.ts',
      Core.Constant.httpMethods
    )
  } catch (e) {
    thrown = true
    assertEquals((e as Error).message.includes('must be a function'), true)
  }
  assertEquals(thrown, true)
})

Deno.test('Scanner#validateModule with empty module object throws', () => {
  let thrown = false
  try {
    Routing.Scanner.validateModule({}, 'routes/empty.ts', Core.Constant.httpMethods)
  } catch (e) {
    thrown = true
    assertEquals((e as Error).message.includes('must export at least one HTTP method'), true)
  }
  assertEquals(thrown, true)
})

Deno.test('Scanner#validateModule with multiple valid methods', () => {
  let thrown = false
  try {
    Routing.Scanner.validateModule(
      { GET: () => {}, POST: () => {}, DELETE: () => {} },
      'routes/items.ts',
      Core.Constant.httpMethods
    )
  } catch {
    thrown = true
  }
  assertEquals(thrown, false)
})
