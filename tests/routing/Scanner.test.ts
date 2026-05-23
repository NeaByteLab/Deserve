import { assertEquals } from 'jsr:@std/assert'
import * as Core from '@core/index.ts'
import * as Routing from '@routing/index.ts'

Deno.test('Scanner#createPattern [id] to :id', () => {
  const ext = Core.Constant.allowedExtensions
  assertEquals(Routing.Scanner.createPattern('items/[id].ts', ext), '/items/:id')
  assertEquals(Routing.Scanner.createPattern('users/[id]/edit.tsx', ext), '/users/:id/edit')
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

Deno.test('Scanner#createPattern with hyphen in name', () => {
  const ext = Core.Constant.allowedExtensions
  assertEquals(Routing.Scanner.createPattern('items/my-file.ts', ext), '/items/my-file')
})

Deno.test('Scanner#createPattern with tilde and plus in name', () => {
  const ext = Core.Constant.allowedExtensions
  assertEquals(Routing.Scanner.createPattern('items/my~file.ts', ext), '/items/my~file')
  assertEquals(Routing.Scanner.createPattern('items/my+file.ts', ext), '/items/my+file')
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
