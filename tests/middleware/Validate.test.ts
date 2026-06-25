import { assertEquals } from '@std/assert'
import * as Middleware from '@middleware/index.ts'
import { Define } from '@neabyte/typebox'
import Helper from '@tests/helper.ts'

Deno.test('Validate check returns 422 on a guard failure', async () => {
  const mw = Middleware.Validate.check({
    query: Define(
      (input: { id: string }) => ({ id: Number(input.id) }),
      (input) => (/^\d+$/.test(input.id) ? true : 'id must be numeric')
    )
  })
  const ctx = Helper.createTestContext('http://localhost/?id=abc')
  const res = await mw(ctx, Helper.okNext)
  assertEquals(res?.status, 422)
})

Deno.test('Validate check returns a middleware function', () => {
  const mw = Middleware.Validate.check({ query: Define((input: { id: string }) => input) })
  assertEquals(typeof mw, 'function')
})

Deno.test('Validate check throws on an empty schema', () => {
  let threw = false
  try {
    Middleware.Validate.check({})
  } catch (e) {
    threw = true
    assertEquals(e instanceof Deno.errors.InvalidData, true)
  }
  assertEquals(threw, true)
})

Deno.test('Validate check validates query and installs validated data', async () => {
  const mw = Middleware.Validate.check({
    query: Define(
      (input: { id: string }) => ({ id: Number(input.id) }),
      (input) => (/^\d+$/.test(input.id) ? true : 'id must be numeric')
    )
  })
  const ctx = Helper.createTestContext('http://localhost/?id=42')
  await mw(ctx, Helper.okNext)
  const validated = ctx.get.validated() as { query: { id: number } }
  assertEquals(validated.query.id, 42)
})
