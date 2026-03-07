import { assertEquals } from 'jsr:@std/assert'
import { Constant } from '@app/index.ts'

Deno.test('Constant#allowedExtensions contains expected route extensions', () => {
  assertEquals(Constant.allowedExtensions.includes('ts'), true)
  assertEquals(Constant.allowedExtensions.includes('tsx'), true)
  assertEquals(Constant.allowedExtensions.includes('js'), true)
  assertEquals(Constant.allowedExtensions.includes('jsx'), true)
  assertEquals(Constant.allowedExtensions.includes('mjs'), true)
  assertEquals(Constant.allowedExtensions.includes('cjs'), true)
  assertEquals(Constant.allowedExtensions.length, 6)
})

Deno.test('Constant#contentTypes has common MIME types', () => {
  assertEquals(Constant.contentTypes['html'], 'text/html')
  assertEquals(Constant.contentTypes['json'], 'application/json')
  assertEquals(Constant.contentTypes['png'], 'image/png')
  assertEquals(Constant.contentTypes['js'], 'application/javascript')
  assertEquals(Constant.contentTypes['txt'], 'text/plain')
  assertEquals(Constant.contentTypes['pdf'], 'application/pdf')
})

Deno.test('Constant#httpMethods contains standard HTTP methods', () => {
  assertEquals(Constant.httpMethods, ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT'])
})
