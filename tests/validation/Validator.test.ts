import { assertEquals, assertThrows } from '@std/assert'
import * as Core from '@core/index.ts'
import * as Validation from '@validation/index.ts'
import { Define } from '@neabyte/typebox'

function createTestContext(): Core.Context {
  const request = new Request('http://localhost/')
  return new Core.Context(request, new URL('http://localhost/'), {})
}

const schema = {
  json: Define((input: { name: string }) => input)
}

Deno.test('Validator.check returns contract output on pass', () => {
  const contract = Define(
    (input: { id: string }) => ({ id: Number(input.id) }),
    (input) => (/^\d+$/.test(input.id) ? true : 'id must be numeric')
  )
  const result = Validation.Validator.check(contract, { id: '42' })
  assertEquals(result.id, 42)
})

Deno.test('Validator.check throws 422 on guard failure', () => {
  const contract = Define(
    (input: { id: string }) => ({ id: Number(input.id) }),
    (input) => (/^\d+$/.test(input.id) ? true : 'id must be numeric')
  )
  try {
    Validation.Validator.check(contract, { id: 'abc' })
    throw new Error('expected throw')
  } catch (error) {
    assertEquals(Core.Handler.isErrorWithStatus(error), true)
    if (Core.Handler.isErrorWithStatus(error)) {
      assertEquals(error.statusCode, 422)
    }
  }
})

Deno.test('Validator.read returns stored validated data', () => {
  const ctx = createTestContext()
  ctx[Core.InternalContext].setInternalState(Core.Handler.stateKeys.validated, {
    json: { name: 'neo' }
  })
  const result = Validation.Validator.read<typeof schema>(ctx)
  assertEquals(result.json.name, 'neo')
})

Deno.test('Validator.read throws 500 when no validation ran', () => {
  const ctx = createTestContext()
  assertThrows(() => Validation.Validator.read(ctx), Error, 'No validated data found')
})

Deno.test('Validator.read throws carries 500 status code', () => {
  const ctx = createTestContext()
  try {
    Validation.Validator.read(ctx)
    throw new Error('expected throw')
  } catch (error) {
    assertEquals(Core.Handler.isErrorWithStatus(error), true)
    if (Core.Handler.isErrorWithStatus(error)) {
      assertEquals(error.statusCode, 500)
    }
  }
})
