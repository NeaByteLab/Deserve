import { assertEquals, assertThrows } from '@std/assert'
import * as Core from '@core/index.ts'

Deno.test('Redirect#buildResponse accepts every declared 3xx redirect status', () => {
  for (const status of [301, 302, 303, 307, 308]) {
    const res = Core.Redirect.buildResponse(
      'http://localhost/',
      {},
      [],
      '/safe',
      status as never
    )
    assertEquals(res.status, status)
    assertEquals(res.headers.get('Location'), 'http://localhost/safe')
  }
})

Deno.test('Redirect#buildResponse appends Set-Cookie values from array', () => {
  const res = Core.Redirect.buildResponse(
    'http://localhost/',
    {},
    ['a=1', 'b=2'],
    '/next',
    302
  )
  const cookies = res.headers.getSetCookie()
  assertEquals(cookies.length, 2)
  assertEquals(cookies[0], 'a=1')
  assertEquals(cookies[1], 'b=2')
})

Deno.test('Redirect#buildResponse body is null', async () => {
  const res = Core.Redirect.buildResponse('https://example.com/', {}, [], '/x', 302)
  assertEquals(await res.text(), '')
})

Deno.test('Redirect#buildResponse extraHeaders cannot override Location', () => {
  const res = Core.Redirect.buildResponse(
    'http://localhost/',
    {},
    [],
    '/real-target',
    302,
    { Location: 'http://evil.com/' }
  )
  assertEquals(res.headers.get('Location'), 'http://localhost/real-target')
})

Deno.test('Redirect#buildResponse extraHeaders override responseHeaders', () => {
  const res = Core.Redirect.buildResponse(
    'https://example.com/',
    { 'X-Key': 'base' },
    [],
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
    [],
    '/done',
    302,
    new Headers({ 'X-Extra': 'extra' })
  )
  assertEquals(res.headers.get('Location'), 'https://example.com/done')
  assertEquals(res.headers.get('X-Base'), 'base')
  assertEquals(res.headers.get('X-Extra'), 'extra')
})

Deno.test('Redirect#buildResponse rejects // with various suffixes', () => {
  const urls = ['//evil.com', '//evil.com/path', '///triple']
  for (const url of urls) {
    let thrown = false
    try {
      Core.Redirect.buildResponse('http://localhost/', {}, [], url, 302)
    } catch {
      thrown = true
    }
    assertEquals(thrown, true)
  }
})

Deno.test('Redirect#buildResponse rejects a non-3xx status so Location never rides a non-redirect response', () => {
  for (const status of [200, 201, 204, 404, 500, 599]) {
    assertThrows(
      () =>
        Core.Redirect.buildResponse(
          'http://localhost/',
          {},
          [],
          '/safe',
          status as never
        ),
      Deno.errors.InvalidData,
      'Redirect status must be one of'
    )
  }
})

Deno.test('Redirect#buildResponse rejects a non-finite status', () => {
  for (const status of [NaN, Infinity, 0, 3.5]) {
    assertThrows(
      () =>
        Core.Redirect.buildResponse(
          'http://localhost/',
          {},
          [],
          '/safe',
          status as never
        ),
      Deno.errors.InvalidData
    )
  }
})

Deno.test('Redirect#buildResponse rejects backslash and tab normalization bypasses', () => {
  const urls = ['/\\evil.com', '\\\\evil.com', '/\t/evil.com', '\\/evil.com']
  for (const url of urls) {
    let thrown = false
    try {
      Core.Redirect.buildResponse('http://localhost/', {}, [], url, 302)
    } catch (e) {
      thrown = true
      assertEquals(e instanceof Deno.errors.InvalidData, true)
    }
    assertEquals(thrown, true)
  }
})

Deno.test('Redirect#buildResponse rejects data scheme after resolution', () => {
  let thrown = false
  try {
    Core.Redirect.buildResponse('http://localhost/', {}, [], 'data:text/html,<h1>x</h1>', 302)
  } catch {
    thrown = true
  }
  assertEquals(thrown, true)
})

Deno.test('Redirect#buildResponse rejects javascript scheme after resolution', () => {
  let thrown = false
  try {
    Core.Redirect.buildResponse('http://localhost/', {}, [], 'javascript:alert(1)', 302)
  } catch {
    thrown = true
  }
  assertEquals(thrown, true)
})

Deno.test('Redirect#buildResponse rejects protocol-relative URL starting with //', () => {
  let thrown = false
  try {
    Core.Redirect.buildResponse('http://localhost/', {}, [], '//evil.com/phish', 302)
  } catch (e) {
    thrown = true
    assertEquals(e instanceof Deno.errors.InvalidData, true)
  }
  assertEquals(thrown, true)
})

Deno.test('Redirect#buildResponse still allows single slash relative paths', () => {
  const res = Core.Redirect.buildResponse('http://localhost/', {}, [], '/login', 302)
  assertEquals(res.headers.get('Location'), 'http://localhost/login')
})

Deno.test('Redirect#buildResponse uses given status', () => {
  const res = Core.Redirect.buildResponse('https://example.com/', {}, [], '/', 307)
  assertEquals(res.status, 307)
})

Deno.test('Redirect#buildResponse with absolute URL leaves unchanged', () => {
  const res = Core.Redirect.buildResponse(
    'https://example.com/',
    {},
    [],
    'https://other.com/go',
    301
  )
  assertEquals(res.status, 301)
  assertEquals(res.headers.get('Location'), 'https://other.com/go')
})

Deno.test('Redirect#buildResponse with array extraHeaders', () => {
  const res = Core.Redirect.buildResponse(
    'https://example.com/',
    {},
    [],
    '/done',
    302,
    [['X-Array', 'val']]
  )
  assertEquals(res.headers.get('X-Array'), 'val')
  assertEquals(res.headers.get('Location'), 'https://example.com/done')
})

Deno.test('Redirect#buildResponse with http:// absolute URL leaves unchanged', () => {
  const res = Core.Redirect.buildResponse(
    'https://example.com/',
    {},
    [],
    'http://other.com/go',
    301
  )
  assertEquals(res.status, 301)
  assertEquals(res.headers.get('Location'), 'http://other.com/go')
})

Deno.test('Redirect#buildResponse with no extraHeaders uses only responseHeaders', () => {
  const res = Core.Redirect.buildResponse(
    'https://example.com/',
    { 'X-Base': 'base' },
    [],
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
    [],
    '/done',
    302,
    { 'X-Obj': 'val' }
  )
  assertEquals(res.headers.get('X-Obj'), 'val')
  assertEquals(res.headers.get('Location'), 'https://example.com/done')
})

Deno.test('Redirect#buildResponse with relative URL no leading slash resolves', () => {
  const res = Core.Redirect.buildResponse('https://example.com/foo/bar', {}, [], 'other', 302)
  assertEquals(res.status, 302)
  assertEquals(res.headers.get('Location'), 'https://example.com/foo/other')
})

Deno.test('Redirect#buildResponse with relative URL resolves against requestUrl', () => {
  const res = Core.Redirect.buildResponse('https://example.com/foo/bar', {}, [], '/baz', 302)
  assertEquals(res.status, 302)
  assertEquals(res.headers.get('Location'), 'https://example.com/baz')
})
