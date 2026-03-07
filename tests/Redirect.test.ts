import { assertEquals } from 'jsr:@std/assert'
import { Redirect } from '@app/index.ts'

Deno.test('Redirect#buildResponse with absolute URL leaves unchanged', () => {
  const res = Redirect.buildResponse('https://example.com/', {}, 'https://other.com/go', 301)
  assertEquals(res.status, 301)
  assertEquals(res.headers.get('Location'), 'https://other.com/go')
})

Deno.test('Redirect#buildResponse merges responseHeaders and extraHeaders', () => {
  const res = Redirect.buildResponse(
    'https://example.com/',
    { 'X-Base': 'base' },
    '/done',
    302,
    new Headers({ 'X-Extra': 'extra' })
  )
  assertEquals(res.headers.get('Location'), 'https://example.com/done')
  assertEquals(res.headers.get('X-Base'), 'base')
  assertEquals(res.headers.get('X-Extra'), 'extra')
})

Deno.test('Redirect#buildResponse with relative URL resolves against requestUrl', () => {
  const res = Redirect.buildResponse('https://example.com/foo/bar', {}, '/baz', 302)
  assertEquals(res.status, 302)
  assertEquals(res.headers.get('Location'), 'https://example.com/baz')
})

Deno.test('Redirect#buildResponse uses given status', () => {
  const res = Redirect.buildResponse('https://example.com/', {}, '/', 307)
  assertEquals(res.status, 307)
})
