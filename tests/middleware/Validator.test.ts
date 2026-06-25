import { assertEquals } from '@std/assert'
import * as Middleware from '@middleware/index.ts'
import { Define } from '@neabyte/typebox'
import Helper from '@tests/helper.ts'

Deno.test('Validator check builds validating middleware', async () => {
  const mw = Middleware.Validator.check({
    query: Middleware.Validator.define((input: { id: string }) => ({ id: Number(input.id) }))
  })
  const ctx = Helper.createTestContext('http://localhost/?id=7')
  await mw(ctx, Helper.okNext)
  const validated = ctx.get.validated() as { query: { id: number } }
  assertEquals(validated.query.id, 7)
})

Deno.test('Validator check rejects an invalid source', () => {
  let threw = false
  try {
    Middleware.Validator.check(
      { invalid: Define((input: unknown) => input) } as never
    )
  } catch (e) {
    threw = true
    assertEquals(e instanceof Deno.errors.InvalidData, true)
  }
  assertEquals(threw, true)
})

Deno.test('Validator define equals the typebox Define helper', () => {
  assertEquals(Middleware.Validator.define, Define)
})

Deno.test('Validator exposes check and define', () => {
  assertEquals(typeof Middleware.Validator.check, 'function')
  assertEquals(typeof Middleware.Validator.define, 'function')
})
