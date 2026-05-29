import { assertEquals } from '@std/assert'
import * as Core from '@core/index.ts'

Deno.test('Redirect#buildResponse body is null', async () => {
  const res = Core.Redirect.buildResponse('https://example.com/', {}, '/x', 302)
  assertEquals(await res.text(), '')
})

Deno.test('Redirect#buildResponse extraHeaders override responseHeaders', () => {
  const res = Core.Redirect.buildResponse(
    'https://example.com/',
    { 'X-Key': 'base' },
    '/done',
    302,
    { 'X-Key': 'override' }
  )
  assertEquals(res.headers.get('X-Key'), 'override')
})

Deno.test('Redirect#buildResponse merges responseHeaders and extraHeaders', () => {
  const res = Core.Redirect.buildResponse(
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

Deno.test('Redirect#buildResponse uses given status', () => {
  const res = Core.Redirect.buildResponse('https://example.com/', {}, '/', 307)
  assertEquals(res.status, 307)
})

Deno.test('Redirect#buildResponse with absolute URL leaves unchanged', () => {
  const res = Core.Redirect.buildResponse('https://example.com/', {}, 'https://other.com/go', 301)
  assertEquals(res.status, 301)
  assertEquals(res.headers.get('Location'), 'https://other.com/go')
})

Deno.test('Redirect#buildResponse with array extraHeaders', () => {
  const res = Core.Redirect.buildResponse(
    'https://example.com/',
    {},
    '/done',
    302,
    [['X-Array', 'val']]
  )
  assertEquals(res.headers.get('X-Array'), 'val')
  assertEquals(res.headers.get('Location'), 'https://example.com/done')
})

Deno.test('Redirect#buildResponse with no extraHeaders uses only responseHeaders', () => {
  const res = Core.Redirect.buildResponse(
    'https://example.com/',
    { 'X-Base': 'base' },
    '/done',
    302
  )
  assertEquals(res.headers.get('Location'), 'https://example.com/done')
  assertEquals(res.headers.get('X-Base'), 'base')
})

Deno.test('Redirect#buildResponse with plain object extraHeaders', () => {
  const res = Core.Redirect.buildResponse(
    'https://example.com/',
    {},
    '/done',
    302,
    { 'X-Obj': 'val' }
  )
  assertEquals(res.headers.get('X-Obj'), 'val')
  assertEquals(res.headers.get('Location'), 'https://example.com/done')
})

Deno.test('Redirect#buildResponse with relative URL resolves against requestUrl', () => {
  const res = Core.Redirect.buildResponse('https://example.com/foo/bar', {}, '/baz', 302)
  assertEquals(res.status, 302)
  assertEquals(res.headers.get('Location'), 'https://example.com/baz')
})
