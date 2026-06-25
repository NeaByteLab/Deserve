import { assertEquals } from '@std/assert'
import * as Core from '@core/index.ts'
import Helper from '@tests/helper.ts'

Deno.test('Handler appendCookies adds Set-Cookie headers', () => {
  const headers = new Headers()
  Core.Handler.appendCookies(headers, ['a=1', 'b=2'])
  assertEquals(headers.get('set-cookie')?.includes('a=1'), true)
})

Deno.test('Handler assertPositiveFinite returns valid value', () => {
  assertEquals(Core.Handler.assertPositiveFinite(5, 'x'), 5)
})

Deno.test('Handler assertPositiveFinite throws on invalid value', () => {
  let threw = false
  try {
    Core.Handler.assertPositiveFinite(0, 'x')
  } catch (e) {
    threw = true
    assertEquals(e instanceof Deno.errors.InvalidData, true)
  }
  assertEquals(threw, true)
})

Deno.test('Handler contentDisposition adds UTF-8 fallback', () => {
  const value = Core.Handler.contentDisposition('résumé.pdf')
  assertEquals(value.includes("filename*=UTF-8''"), true)
})

Deno.test('Handler contentDisposition sanitizes filename', () => {
  const value = Core.Handler.contentDisposition('report.pdf')
  assertEquals(value.includes('filename="report.pdf"'), true)
})

Deno.test('Handler createStatusError attaches status code', () => {
  const error = Core.Handler.createStatusError(418, 'teapot')
  assertEquals(error.statusCode, 418)
  assertEquals(Core.Handler.isStatusError(error), true)
})

Deno.test('Handler errorResponse uses context negotiation', async () => {
  const ctx = Helper.createTestContext('http://localhost/x', {
    headers: { accept: 'application/json' }
  })
  const res = Core.Handler.errorResponse(ctx, 404)
  assertEquals(res.status, 404)
  assertEquals(res.headers.get('content-type'), 'application/problem+json')
  await res.body?.cancel()
})

Deno.test('Handler extractError defaults to 500 for unknown', () => {
  const result = Core.Handler.extractError('boom')
  assertEquals(result.statusCode, 500)
})

Deno.test('Handler extractError maps Deno NotFound to 404', () => {
  const result = Core.Handler.extractError(new Deno.errors.NotFound('missing'))
  assertEquals(result.statusCode, 404)
})

Deno.test('Handler isDirectory returns false for missing path', () => {
  assertEquals(Core.Handler.isDirectory('./does-not-exist-xyz'), false)
})

Deno.test('Handler isStatusError rejects non-status errors', () => {
  assertEquals(Core.Handler.isStatusError(new Error('x')), false)
  assertEquals(Core.Handler.isStatusError('x'), false)
})

Deno.test('Handler negotiatedResponse builds JSON when wanted', async () => {
  const res = Core.Handler.negotiatedResponse(404, 'Not Found', true, '/x')
  assertEquals(res.status, 404)
  assertEquals(res.headers.get('content-type'), 'application/problem+json')
  await res.body?.cancel()
})

Deno.test('Handler problemDetails includes instance when given', () => {
  const details = Core.Handler.problemDetails(404, '/missing')
  assertEquals(details.status, 404)
  assertEquals(details.instance, '/missing')
})

Deno.test('Handler safeMessage falls back by range', () => {
  assertEquals(Core.Handler.safeMessage(599), 'Internal Server Error')
  assertEquals(Core.Handler.safeMessage(418), 'Bad Request')
})

Deno.test('Handler safeMessage maps known status codes', () => {
  assertEquals(Core.Handler.safeMessage(404), 'Not Found')
  assertEquals(Core.Handler.safeMessage(500), 'Internal Server Error')
})

Deno.test('Handler toRecord normalizes headers input', () => {
  assertEquals(Core.Handler.toRecord({ a: '1' }), { a: '1' })
  assertEquals(Core.Handler.toRecord(new Headers({ b: '2' })), { b: '2' })
  assertEquals(Core.Handler.toRecord(undefined), {})
})

Deno.test('Handler wantsJson detects JSON accept header', () => {
  const headers = new Headers({ accept: 'application/json' })
  assertEquals(Core.Handler.wantsJson(headers), true)
})

Deno.test('Handler wantsJson returns false for missing accept', () => {
  assertEquals(Core.Handler.wantsJson(new Headers()), false)
})
