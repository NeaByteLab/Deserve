import { assertEquals } from '@std/assert'
import * as Core from '@core/index.ts'

Deno.test(
  'Error#buildResponse Accept with multiple types including json returns JSON',
  async () => {
    const request = new Request('http://localhost/multi', {
      headers: new Headers({ Accept: 'text/html, application/json' })
    })
    const ctx = new Core.Context(request, new URL('http://localhost/multi'), {})
    const res = await Core.Error.buildResponse(
      ctx,
      400,
      new globalThis.Error('bad request'),
      null
    )
    assertEquals(res.status, 400)
    assertEquals(res.headers.get('Content-Type'), 'application/json')
    const body = (await res.json()) as { error: string }
    assertEquals(body.error, 'Bad Request')
  }
)

Deno.test('Error#buildResponse with errorMiddleware receives correct error info', async () => {
  const request = new Request('http://localhost/test-path', { method: 'POST' })
  const ctx = new Core.Context(request, new URL('http://localhost/test-path'), {})
  let receivedInfo: unknown = null
  await Core.Error.buildResponse(
    ctx,
    422,
    new globalThis.Error('validation failed'),
    async (_ctx, info) => {
      receivedInfo = info
      return null
    }
  )
  const info = receivedInfo as {
    url: string
    method: string
    pathname: string
    statusCode: number
    error: Error
  }
  assertEquals(info.statusCode, 422)
  assertEquals(info.method, 'POST')
  assertEquals(info.pathname, '/test-path')
  assertEquals(info.error.message, 'validation failed')
})

Deno.test('Error#buildResponse with errorMiddleware returning null uses default', async () => {
  const request = new Request('http://localhost/bar', {
    headers: new Headers({ Accept: 'application/json' })
  })
  const ctx = new Core.Context(request, new URL('http://localhost/bar'), {})
  const res = await Core.Error.buildResponse(
    ctx,
    502,
    new globalThis.Error('bad'),
    async () => null
  )
  assertEquals(res.status, 502)
  const body = (await res.json()) as { error: string }
  assertEquals(body.error, 'Bad Gateway')
})

Deno.test('Error#buildResponse with errorMiddleware returning response uses it', async () => {
  const request = new Request('http://localhost/')
  const ctx = new Core.Context(request, new URL('http://localhost/'), {})
  const customRes = new globalThis.Response('custom body', { status: 499 })
  const res = await Core.Error.buildResponse(
    ctx,
    500,
    new globalThis.Error('x'),
    async () => customRes
  )
  assertEquals(res, customRes)
  assertEquals(await res.text(), 'custom body')
  assertEquals(res.status, 499)
})

Deno.test('Error#buildResponse with errorMiddleware that throws propagates error', async () => {
  const request = new Request('http://localhost/')
  const ctx = new Core.Context(request, new URL('http://localhost/'), {})
  let thrown = false
  try {
    await Core.Error.buildResponse(ctx, 500, new globalThis.Error('original'), () => {
      throw new globalThis.Error('middleware threw')
    })
  } catch (e) {
    thrown = true
    assertEquals((e as globalThis.Error).message, 'middleware threw')
  }
  assertEquals(thrown, true)
})

Deno.test('Error#buildResponse with sync errorMiddleware returning null', async () => {
  const request = new Request('http://localhost/', {
    headers: new Headers({ Accept: 'application/json' })
  })
  const ctx = new Core.Context(request, new URL('http://localhost/'), {})
  const res = await Core.Error.buildResponse(ctx, 500, new globalThis.Error('fail'), () => null)
  assertEquals(res.status, 500)
  const body = (await res.json()) as { error: string }
  assertEquals(body.error, 'Internal Server Error')
})

Deno.test(
  'Error#buildResponse without errorMiddleware returns HTML when no Accept json',
  async () => {
    const request = new Request('http://localhost/')
    const ctx = new Core.Context(request, new URL('http://localhost/'), {})
    const res = await Core.Error.buildResponse(ctx, 500, new globalThis.Error('oops'), null)
    assertEquals(res.status, 500)
    assertEquals(res.headers.get('Content-Type'), 'text/html; charset=utf-8')
    const html = await res.text()
    assertEquals(html.includes('500'), true)
    assertEquals(html.includes('Internal Server Error'), true)
  }
)

Deno.test('Error#buildResponse without errorMiddleware returns JSON when Accept json', async () => {
  const request = new Request('http://localhost/foo', {
    headers: new Headers({ Accept: 'application/json' })
  })
  const ctx = new Core.Context(request, new URL('http://localhost/foo'), {})
  const res = await Core.Error.buildResponse(ctx, 404, new globalThis.Error('gone'), null)
  assertEquals(res.status, 404)
  assertEquals(res.headers.get('Content-Type'), 'application/json')
  const body = (await res.json()) as { error: string; path: string; statusCode: number }
  assertEquals(body.error, 'Not Found')
  assertEquals(body.path, '/foo')
  assertEquals(body.statusCode, 404)
})

Deno.test('Error#defaultErrorHtml escapes quotes and apostrophes in message', () => {
  const html = Core.Error.defaultErrorHtml(500, 'Error "test" & \'value\'')
  assertEquals(html.includes('&quot;test&quot;'), true)
  assertEquals(html.includes('&#39;value&#39;'), true)
  assertEquals(html.includes('&amp;'), true)
  assertEquals(html.includes('"test"'), false)
})

Deno.test('Error#defaultErrorHtml includes status and escaped message', () => {
  const html = Core.Error.defaultErrorHtml(404, 'Not <found>')
  assertEquals(html.includes('404'), true)
  assertEquals(html.includes('&lt;found&gt;'), true)
  assertEquals(html.includes('<found>'), false)
})

Deno.test('Error#escapeHtml escapes &, <, >, ", \'', () => {
  assertEquals(Core.Error.escapeHtml('a & b'), 'a &amp; b')
  assertEquals(Core.Error.escapeHtml('<script>'), '&lt;script&gt;')
  assertEquals(Core.Error.escapeHtml('x > 0'), 'x &gt; 0')
  assertEquals(Core.Error.escapeHtml('"quoted"'), '&quot;quoted&quot;')
  assertEquals(Core.Error.escapeHtml("it's"), 'it&#39;s')
})

Deno.test('Error#escapeHtml escapes all special chars together', () => {
  assertEquals(
    Core.Error.escapeHtml('<img src="x" onerror=\'alert(1)\'>&'),
    '&lt;img src=&quot;x&quot; onerror=&#39;alert(1)&#39;&gt;&amp;'
  )
})

Deno.test('Error#escapeHtml passes through string with no special chars', () => {
  assertEquals(Core.Error.escapeHtml('hello world'), 'hello world')
})

Deno.test('Error#escapeHtml returns empty string for empty input', () => {
  assertEquals(Core.Error.escapeHtml(''), '')
})

Deno.test('Error#escapeHtml with only special characters', () => {
  assertEquals(Core.Error.escapeHtml('&<>"\''), '&amp;&lt;&gt;&quot;&#39;')
})
