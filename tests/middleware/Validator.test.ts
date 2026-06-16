import { assertEquals, assertThrows } from '@std/assert'
import * as Core from '@core/index.ts'
import * as Middleware from '@middleware/index.ts'
import * as Validation from '@validation/index.ts'
import { Define } from '@neabyte/typebox'

function createTestContext(url = 'http://localhost/', requestInit?: RequestInit): Core.Context {
  const request = new Request(url, requestInit)
  return new Core.Context(request, new URL(url), {})
}

function jsonRequest(body: unknown, url = 'http://localhost/'): Core.Context {
  return createTestContext(url, {
    method: 'POST',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body)
  })
}

Deno.test('Validate contract throw maps to 422 (client input never causes 500)', async () => {
  const schema = {
    json: Define((input: { value: number }) => {
      if (input.value === 0) {
        throw new RangeError('value cannot be zero')
      }
      return input
    })
  }
  const middleware = Middleware.Mware.validator(schema)
  const ctx = jsonRequest({ value: 0 })
  const next = async (): Promise<Response> => new Response('ok')
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(res.status, 422)
  }
})

Deno.test('Validate empty schema throws at build time', () => {
  assertThrows(() => Middleware.Mware.validator({}), Deno.errors.InvalidData)
})

Deno.test('Validate failing guard returns 422 with reasons', async () => {
  const schema = {
    json: Define(
      (input: { age: number }) => input,
      (input) => (input.age >= 18 ? true : 'age must be at least 18')
    )
  }
  const middleware = Middleware.Mware.validator(schema)
  const ctx = jsonRequest({ age: 12 })
  const next = async (): Promise<Response> => new Response('ok')
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(res.status, 422)
  }
})

Deno.test('Validate multi-source schema validates each part', async () => {
  const schema = {
    json: Define((input: { name: string }) => input),
    query: Define((input: Record<string, string>) => input)
  }
  const middleware = Middleware.Mware.validator(schema)
  const ctx = jsonRequest({ name: 'neo' }, 'http://localhost/?page=1')
  let name = ''
  let page = ''
  const next = async (): Promise<Response> => {
    const { json, query } = Validation.Validator.read<typeof schema>(ctx)
    name = json.name
    page = query['page'] ?? ''
    return new Response('ok')
  }
  await middleware(ctx, next)
  assertEquals(name, 'neo')
  assertEquals(page, '1')
})

Deno.test('Validate null JSON body against object guard maps to 422 not 500', async () => {
  const schema = {
    json: Define(
      (body: { name: string }) => ({ name: body.name.trim() }),
      (body) => (typeof body.name === 'string' && body.name.length > 0 ? true : 'name required')
    )
  }
  const middleware = Middleware.Mware.validator(schema)
  const ctx = jsonRequest(null)
  const next = async (): Promise<Response> => new Response('ok')
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(res.status, 422)
  }
})

Deno.test('Validate passing guard stores typed data on context', async () => {
  const schema = {
    json: Define(
      (input: { name: string; age: number }) => input,
      (input) => (input.age >= 18 ? true : 'age must be at least 18')
    )
  }
  const middleware = Middleware.Mware.validator(schema)
  const ctx = jsonRequest({ name: 'neo', age: 30 })
  let name = ''
  const next = async (): Promise<Response> => {
    const { json } = Validation.Validator.read<typeof schema>(ctx)
    name = json.name
    return new Response('ok')
  }
  const res = await middleware(ctx, next)
  assertEquals(name, 'neo')
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(await res.text(), 'ok')
  }
})

Deno.test('Validate stacked validators merge validated sources', async () => {
  const querySchema = { query: Define((input: Record<string, string>) => input) }
  const jsonSchema = { json: Define((input: { name: string }) => input) }
  const ctx = jsonRequest({ name: 'neo' }, 'http://localhost/?id=7')
  const passThrough = async (): Promise<Response> => new Response('ok')
  await Middleware.Mware.validator(querySchema)(ctx, passThrough)
  let queryId = ''
  let jsonName = ''
  await Middleware.Mware.validator(jsonSchema)(ctx, async () => {
    const merged = Validation.Validator.read<typeof querySchema & typeof jsonSchema>(ctx)
    queryId = merged.query['id'] ?? ''
    jsonName = merged.json.name
    return new Response('ok')
  })
  assertEquals(queryId, '7')
  assertEquals(jsonName, 'neo')
})

Deno.test('Validator rejects a params source in middleware at registration', () => {
  const paramsSchema = { params: Define((input: Record<string, string>) => input) }
  assertThrows(
    () => Middleware.Mware.validator(paramsSchema),
    Deno.errors.InvalidData,
    'Validator.check(contract, ctx.params())'
  )
})

Deno.test('Validator throws when no validation ran', () => {
  const ctx = createTestContext()
  assertThrows(() => Validation.Validator.read(ctx), Error)
})
