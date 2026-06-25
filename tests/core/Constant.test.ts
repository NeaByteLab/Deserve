import { assertEquals } from '@std/assert'
import * as Core from '@core/index.ts'

Deno.test('Constant content types map known extensions', () => {
  assertEquals(Core.Constant.contentTypes['html'], 'text/html; charset=utf-8')
  assertEquals(Core.Constant.contentTypes['css'], 'text/css; charset=utf-8')
  assertEquals(Core.Constant.contentTypes['png'], 'image/png')
  assertEquals(Core.Constant.defaultContentType, 'application/octet-stream')
})

Deno.test('Constant default session options use safe defaults', () => {
  assertEquals(Core.Constant.defaultSessionOptions.name, 'session')
  assertEquals(Core.Constant.defaultSessionOptions.httpOnly, true)
  assertEquals(Core.Constant.defaultSessionOptions.sameSite, 'Lax')
})

Deno.test('Constant exposes default numeric limits', () => {
  assertEquals(Core.Constant.maxUrlLength, 8192)
  assertEquals(Core.Constant.maxParamLength, 1024)
  assertEquals(Core.Constant.defaultPoolSize, 4)
  assertEquals(Core.Constant.defaultQueueFactor, 8)
  assertEquals(Core.Constant.defaultQueueWaitMs, 2000)
  assertEquals(Core.Constant.defaultWorkerTaskTimeoutMs, 5000)
})

Deno.test('Constant html escape map covers unsafe characters', () => {
  assertEquals(Core.Constant.htmlEscapeMap['&'], '&amp;')
  assertEquals(Core.Constant.htmlEscapeMap['<'], '&lt;')
  assertEquals(Core.Constant.htmlEscapeMap['>'], '&gt;')
  assertEquals(Core.Constant.htmlEscapeMap['"'], '&quot;')
  assertEquals(Core.Constant.htmlEscapeMap["'"], '&#39;')
})

Deno.test('Constant http methods include common verbs', () => {
  assertEquals(Core.Constant.httpMethods.includes('GET'), true)
  assertEquals(Core.Constant.httpMethods.includes('POST'), true)
  assertEquals(Core.Constant.httpMethods.includes('DELETE'), true)
})

Deno.test('Constant null body and redirect status sets', () => {
  assertEquals(Core.Constant.nullBodyStatuses.has(204), true)
  assertEquals(Core.Constant.nullBodyStatuses.has(200), false)
  assertEquals(Core.Constant.redirectStatuses.has(302), true)
  assertEquals(Core.Constant.redirectStatuses.has(200), false)
})

Deno.test('Constant security headers carry defaults', () => {
  assertEquals(Core.Constant.securityHeaders.xContentTypeOptions.default, 'nosniff')
  assertEquals(Core.Constant.securityHeaders.xFrameOptions.default, 'SAMEORIGIN')
})

Deno.test('Constant server error messages map status codes', () => {
  assertEquals(Core.Constant.serverErrorMessages[404], 'Not Found')
  assertEquals(Core.Constant.serverErrorMessages[500], 'Internal Server Error')
})

Deno.test('Constant shared encoder and decoder are usable', () => {
  const bytes = Core.Constant.encoder.encode('hi')
  assertEquals(Core.Constant.decoder.decode(bytes), 'hi')
})
