import { assertEquals } from '@std/assert'
import * as Core from '@core/index.ts'

Deno.test('Redirect buildResponse allows explicit absolute cross-origin', () => {
  const res = Core.Redirect.buildResponse('http://localhost/', {}, [], 'https://other.test/x', 307)
  assertEquals(res.headers.get('location'), 'https://other.test/x')
})

Deno.test('Redirect buildResponse builds a 302 with location', () => {
  const res = Core.Redirect.buildResponse('http://localhost/', {}, [], '/next', 302)
  assertEquals(res.status, 302)
  assertEquals(res.headers.get('location'), 'http://localhost/next')
})

Deno.test('Redirect buildResponse merges accumulated headers and cookies', () => {
  const res = Core.Redirect.buildResponse('http://localhost/', { 'x-a': '1' }, ['s=1'], '/n', 302)
  assertEquals(res.headers.get('x-a'), '1')
  assertEquals(res.headers.get('set-cookie')?.includes('s=1'), true)
})

Deno.test('Redirect buildResponse resolves relative location', () => {
  const res = Core.Redirect.buildResponse('http://localhost/a/b', {}, [], '../c', 303)
  assertEquals(res.headers.get('location'), 'http://localhost/c')
})

Deno.test('Redirect buildResponse throws on non-redirect status', () => {
  let threw = false
  try {
    Core.Redirect.buildResponse('http://localhost/', {}, [], '/n', 200 as 302)
  } catch (e) {
    threw = true
    assertEquals(e instanceof Deno.errors.InvalidData, true)
  }
  assertEquals(threw, true)
})
