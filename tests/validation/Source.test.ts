import { assertEquals } from '@std/assert'
import * as Core from '@core/index.ts'
import * as Validation from '@validation/index.ts'

function createTestContext(url = 'http://localhost/', requestInit?: RequestInit): Core.Context {
  const request = new Request(url, requestInit)
  return new Core.Context(request, new URL(url), { id: '42' })
}

Deno.test('Source.extract body returns parsed text body', async () => {
  const ctx = createTestContext('http://localhost/', { method: 'POST', body: 'hello' })
  const result = await Validation.Source.extract('body', ctx)
  assertEquals(result, 'hello')
})

Deno.test('Source.extract cookies returns parsed cookie record', async () => {
  const ctx = createTestContext('http://localhost/', {
    headers: new Headers({ cookie: 'a=1; b=2' })
  })
  const result = await Validation.Source.extract('cookies', ctx)
  assertEquals(result, { a: '1', b: '2' })
})

Deno.test('Source.extract headers returns header record', async () => {
  const ctx = createTestContext('http://localhost/', {
    headers: new Headers({ 'x-test': 'value' })
  })
  const result = (await Validation.Source.extract('headers', ctx)) as Record<string, string>
  assertEquals(result['x-test'], 'value')
})

Deno.test('Source.extract json returns parsed json body', async () => {
  const ctx = createTestContext('http://localhost/', {
    method: 'POST',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ name: 'neo' })
  })
  const result = await Validation.Source.extract('json', ctx)
  assertEquals(result, { name: 'neo' })
})

Deno.test('Source.extract params returns route params', async () => {
  const ctx = createTestContext()
  const result = await Validation.Source.extract('params', ctx)
  assertEquals(result, { id: '42' })
})

Deno.test('Source.extract query returns query record', async () => {
  const ctx = createTestContext('http://localhost/?page=1&size=10')
  const result = await Validation.Source.extract('query', ctx)
  assertEquals(result, { page: '1', size: '10' })
})
