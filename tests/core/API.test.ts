import { assertEquals } from '@std/assert'
import * as Core from '@core/index.ts'
import * as Routing from '@routing/index.ts'

Deno.test('API jsonParse and jsonStringify resist a patched global JSON', () => {
  const realParse = globalThis.JSON.parse
  const realStringify = globalThis.JSON.stringify
  try {
    ;(globalThis.JSON as unknown as { parse: unknown }).parse = () => ({ hijacked: true })
    ;(globalThis.JSON as unknown as { stringify: unknown }).stringify = () => 'hijacked'
    assertEquals(Core.API.jsonParse('{"value":42}'), { value: 42 })
    assertEquals(Core.API.jsonStringify({ value: 42 }), '{"value":42}')
  } finally {
    ;(globalThis.JSON as unknown as { parse: unknown }).parse = realParse
    ;(globalThis.JSON as unknown as { stringify: unknown }).stringify = realStringify
  }
})

Deno.test('API table is frozen and exposes pinned built-ins', () => {
  assertEquals(Object.isFrozen(Core.API), true)
  assertEquals(typeof Core.API.Response, 'function')
  assertEquals(typeof Core.API.Headers, 'function')
  assertEquals(typeof Core.API.URL, 'function')
  assertEquals(typeof Core.API.jsonParse, 'function')
  assertEquals(typeof Core.API.subtle, 'object')
})

Deno.test('Handler produces a genuine Response when globalThis.Response is patched after load', async () => {
  const realResponse = globalThis.Response
  try {
    ;(globalThis as unknown as { Response: unknown }).Response = class {
      constructor() {
        throw new Error('hijacked Response')
      }
      static json(): never {
        throw new Error('hijacked Response.json')
      }
    }
    const serve = new Routing.Handler().createHandler()
    const html = await serve(
      new Request('http://localhost/missing', { headers: { accept: 'text/html' } })
    )
    const json = await serve(
      new Request('http://localhost/missing', { headers: { accept: 'application/json' } })
    )
    assertEquals(html instanceof realResponse, true)
    assertEquals(html.status, 404)
    assertEquals(html.headers.get('content-type'), 'text/html; charset=utf-8')
    assertEquals(json instanceof realResponse, true)
    assertEquals(json.status, 404)
    assertEquals(json.headers.get('content-type'), 'application/json')
  } finally {
    ;(globalThis as unknown as { Response: unknown }).Response = realResponse
  }
})
