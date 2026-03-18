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
    assertEquals((e as Error).message.includes('Must export at least one HTTP method'), true)
  }
  assertEquals(thrown, true)
})
