import { assertEquals } from '@std/assert'
import * as Core from '@core/index.ts'

Deno.test('API exposes pinned native built-ins', () => {
  assertEquals(typeof Core.API.Response, 'function')
  assertEquals(typeof Core.API.Headers, 'function')
  assertEquals(typeof Core.API.Request, 'function')
  assertEquals(typeof Core.API.URL, 'function')
  assertEquals(typeof Core.API.Error, 'function')
  assertEquals(typeof Core.API.TextEncoder, 'function')
  assertEquals(typeof Core.API.TextDecoder, 'function')
  assertEquals(typeof Core.API.Worker, 'function')
  assertEquals(typeof Core.API.subtle, 'object')
})

Deno.test('API importRouteModule rejects for a missing module', async () => {
  let threw = false
  try {
    await Core.API.importRouteModule('/does/not/exist/route.ts')
  } catch {
    threw = true
  }
  assertEquals(threw, true)
})

Deno.test('API jsonParse and jsonStringify round-trip a value', () => {
  const text = Core.API.jsonStringify({ value: 42, nested: { ok: true } })
  assertEquals(Core.API.jsonParse(text), { value: 42, nested: { ok: true } })
})

Deno.test('API jsonParse parses JSON text', () => {
  assertEquals(Core.API.jsonParse('{"value":42}'), { value: 42 })
})

Deno.test('API jsonStringify serializes value', () => {
  assertEquals(Core.API.jsonStringify({ value: 42 }), '{"value":42}')
})

Deno.test('API table is frozen', () => {
  assertEquals(Object.isFrozen(Core.API), true)
})
