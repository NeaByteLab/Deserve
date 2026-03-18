import { assertEquals } from 'jsr:@std/assert'
import * as Core from '@core/index.ts'

Deno.test('Constant#allowedExtensions contains expected route extensions', () => {
  assertEquals(Core.Constant.allowedExtensions.includes('ts'), true)
  assertEquals(Core.Constant.allowedExtensions.includes('tsx'), true)
  assertEquals(Core.Constant.allowedExtensions.includes('js'), true)
  assertEquals(Core.Constant.allowedExtensions.includes('jsx'), true)
  assertEquals(Core.Constant.allowedExtensions.includes('mjs'), true)
  assertEquals(Core.Constant.allowedExtensions.includes('cjs'), true)
  assertEquals(Core.Constant.allowedExtensions.length, 6)
})

Deno.test('Constant#contentTypes has common MIME types', () => {
  assertEquals(Core.Constant.contentTypes['html'], 'text/html')
  assertEquals(Core.Constant.contentTypes['json'], 'application/json')
  assertEquals(Core.Constant.contentTypes['png'], 'image/png')
  assertEquals(Core.Constant.contentTypes['js'], 'application/javascript')
  assertEquals(Core.Constant.contentTypes['txt'], 'text/plain')
  assertEquals(Core.Constant.contentTypes['pdf'], 'application/pdf')
  assertEquals(Core.Constant.contentTypes['css'], 'text/css')
  assertEquals(Core.Constant.contentTypes['svg'], 'image/svg+xml')
})

Deno.test('Constant#httpMethods contains standard HTTP methods', () => {
  assertEquals(Core.Constant.httpMethods, [
    'DELETE',
    'GET',
    'HEAD',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT'
  ])
})
