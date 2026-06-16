import { assertEquals } from '@std/assert'
import * as Core from '@core/index.ts'

Deno.test('Error#buildResponse 500 does not leak error message', async () => {
  const request = new Request('http://localhost/', {
    headers: new Headers({ Accept: 'application/json' })
  })
  const ctx = new Core.Context(request, new URL('http://localhost/'), {})
  const res = await Core.Handler.buildResponse(
    ctx,
    500,
    new globalThis.Error('Connection to ************************ failed'),
    null
  )
  const body = (await res.json()) as { title: string }
  assertEquals(body.title, 'Internal Server Error')
  assertEquals(JSON.stringify(body).includes('password'), false)
})

Deno.test('Error#buildResponse HTML output escapes message content', async () => {
  const request = new Request('http://localhost/')
  const ctx = new Core.Context(request, new URL('http://localhost/'), {})
  const res = await Core.Handler.buildResponse(ctx, 404, new globalThis.Error('irrelevant'), null)
  const html = await res.text()
  assertEquals(html.includes('<script>'), false)
  assertEquals(html.includes('Not Found'), true)
})

Deno.test('Error#buildResponse preserves security headers when errorMiddleware returns a non-Response', async () => {
  const request = new Request('http://localhost/x', {
    headers: new Headers({ Accept: 'application/json' })
  })
  const ctx = new Core.Context(request, new URL('http://localhost/x'), {})
  ctx.setHeader('X-Content-Type-Options', 'nosniff')
  const res = await Core.Handler.buildResponse(
    ctx,
    500,
    new globalThis.Error('boom'),
    async () => 'broke' as never
  )
  assertEquals(res.status, 500)
  assertEquals(res.headers.get('X-Content-Type-Options'), 'nosniff')
  assertEquals(res.headers.get('Content-Type'), 'application/problem+json')
  const body = (await res.json()) as { title: string }
  assertEquals(body.title, 'Internal Server Error')
})

Deno.test('Error#buildResponse uses generic message for unmapped 418 status', async () => {
  const request = new Request('http://localhost/', {
    headers: new Headers({ Accept: 'application/json' })
  })
  const ctx = new Core.Context(request, new URL('http://localhost/'), {})
  const res = await Core.Handler.buildResponse(
    ctx,
    418,
    new globalThis.Error('secret internal detail'),
    null
  )
  const body = (await res.json()) as { title: string; status: number }
  assertEquals(body.title, 'Bad Request')
  assertEquals(body.status, 418)
})

Deno.test('Error#buildResponse uses generic message for unmapped 599 status', async () => {
  const request = new Request('http://localhost/', {
    headers: new Headers({ Accept: 'application/json' })
  })
  const ctx = new Core.Context(request, new URL('http://localhost/'), {})
  const res = await Core.Handler.buildResponse(
    ctx,
    599,
    new globalThis.Error('db password leaked'),
    null
  )
  const body = (await res.json()) as { title: string }
  assertEquals(body.title, 'Internal Server Error')
})

Deno.test('Error#buildResponse with errorMiddleware receives correct error info', async () => {
  const request = new Request('http://localhost/test-path', { method: 'POST' })
  const ctx = new Core.Context(request, new URL('http://localhost/test-path'), {})
  let receivedInfo: unknown = null
  await Core.Handler.buildResponse(
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
  const res = await Core.Handler.buildResponse(
    ctx,
    502,
    new globalThis.Error('bad'),
    async () => null
  )
  assertEquals(res.status, 502)
  const body = (await res.json()) as { title: string }
  assertEquals(body.title, 'Bad Gateway')
})

Deno.test('Error#buildResponse with errorMiddleware returning response uses it', async () => {
  const request = new Request('http://localhost/')
  const ctx = new Core.Context(request, new URL('http://localhost/'), {})
  const customRes = new globalThis.Response('custom body', { status: 499 })
  const res = await Core.Handler.buildResponse(
    ctx,
    500,
    new globalThis.Error('x'),
    async () => customRes
  )
  assertEquals(res, customRes)
  assertEquals(await res.text(), 'custom body')
  assertEquals(res.status, 499)
})

Deno.test('Error#buildResponse with errorMiddleware returns non-Response falls through to safe default', async () => {
  const nonResponseReturns: unknown[] = ['something broke', { error: 1 }, 42, true]
  for (const ret of nonResponseReturns) {
    const request = new Request('http://localhost/x', {
      headers: new Headers({ Accept: 'application/json' })
    })
    const ctx = new Core.Context(request, new URL('http://localhost/x'), {})
    const res = await Core.Handler.buildResponse(
      ctx,
      500,
      new globalThis.Error('boom'),
      async () => ret as never
    )
    assertEquals(res.status, 500)
    assertEquals(res.headers.get('Content-Type'), 'application/problem+json')
    const body = (await res.json()) as { title: string }
    assertEquals(body.title, 'Internal Server Error')
  }
})

Deno.test('Error#buildResponse with errorMiddleware that throws propagates error', async () => {
  const request = new Request('http://localhost/')
  const ctx = new Core.Context(request, new URL('http://localhost/'), {})
  let thrown = false
  try {
    await Core.Handler.buildResponse(ctx, 500, new globalThis.Error('original'), () => {
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
  const res = await Core.Handler.buildResponse(ctx, 500, new globalThis.Error('fail'), () => null)
  assertEquals(res.status, 500)
  const body = (await res.json()) as { title: string }
  assertEquals(body.title, 'Internal Server Error')
})

Deno.test('Error#buildResponse without errorMiddleware returns JSON when Accept json', async () => {
  const request = new Request('http://localhost/foo', {
    headers: new Headers({ Accept: 'application/json' })
  })
  const ctx = new Core.Context(request, new URL('http://localhost/foo'), {})
  const res = await Core.Handler.buildResponse(ctx, 404, new globalThis.Error('gone'), null)
  assertEquals(res.status, 404)
  assertEquals(res.headers.get('Content-Type'), 'application/problem+json')
  const body = (await res.json()) as { title: string; instance: string; status: number }
  assertEquals(body.title, 'Not Found')
  assertEquals(body.instance, '/foo')
  assertEquals(body.status, 404)
})

Deno.test('Error#defaultErrorHtml escapes quotes and apostrophes in message', () => {
  const html = Core.Handler.defaultErrorHtml(500, 'Error "test" & \'value\'')
  assertEquals(html.includes('&quot;test&quot;'), true)
  assertEquals(html.includes('&#39;value&#39;'), true)
  assertEquals(html.includes('&amp;'), true)
  assertEquals(html.includes('"test"'), false)
})

Deno.test('Error#defaultErrorHtml includes status and escaped message', () => {
  const html = Core.Handler.defaultErrorHtml(404, 'Not <found>')
  assertEquals(html.includes('404'), true)
  assertEquals(html.includes('&lt;found&gt;'), true)
  assertEquals(html.includes('<found>'), false)
})

Deno.test('Error#errorResponse falls back to a hardened HTML response when headers are poisoned', async () => {
  const request = new Request('http://localhost/')
  const ctx = new Core.Context(request, new URL('http://localhost/'), {})
  ;(ctx as unknown as { responseHeaders: Record<string, string> }).responseHeaders['Inva lid'] = 'x'
  const res = Core.Handler.errorResponse(ctx, 500)
  assertEquals(res.status, 500)
  assertEquals(res.headers.get('Content-Type'), 'text/html; charset=utf-8')
  assertEquals(res.headers.get('X-Content-Type-Options'), 'nosniff')
  const html = await res.text()
  assertEquals(html.includes('500'), true)
  assertEquals(html.includes('Internal Server Error'), true)
})

Deno.test('Error#errorResponse falls back to a hardened JSON response when headers are poisoned', async () => {
  const request = new Request('http://localhost/', {
    headers: new Headers({ Accept: 'application/json' })
  })
  const ctx = new Core.Context(request, new URL('http://localhost/'), {})
  ;(ctx as unknown as { responseHeaders: Record<string, string> }).responseHeaders['Inva lid'] = 'x'
  const res = Core.Handler.errorResponse(ctx, 500)
  assertEquals(res.status, 500)
  assertEquals(res.headers.get('Content-Type'), 'application/problem+json')
  assertEquals(res.headers.get('X-Content-Type-Options'), 'nosniff')
  const body = (await res.json()) as { title: string }
  assertEquals(body.title, 'Internal Server Error')
})

Deno.test('Error#escapeHtml escapes &, <, >, ", \'', () => {
  assertEquals(Core.Handler.escapeHtml('a & b'), 'a &amp; b')
  assertEquals(Core.Handler.escapeHtml('<script>'), '&lt;script&gt;')
  assertEquals(Core.Handler.escapeHtml('x > 0'), 'x &gt; 0')
  assertEquals(Core.Handler.escapeHtml('"quoted"'), '&quot;quoted&quot;')
  assertEquals(Core.Handler.escapeHtml("it's"), 'it&#39;s')
})

Deno.test('Error#escapeHtml escapes all special chars together', () => {
  assertEquals(
    Core.Handler.escapeHtml('<img src="x" onerror=\'alert(1)\'>&'),
    '&lt;img src=&quot;x&quot; onerror=&#39;alert(1)&#39;&gt;&amp;'
  )
})

Deno.test('Error#escapeHtml passes through string with no special chars', () => {
  assertEquals(Core.Handler.escapeHtml('hello world'), 'hello world')
})

Deno.test('Error#escapeHtml returns empty string for empty input', () => {
  assertEquals(Core.Handler.escapeHtml(''), '')
})

Deno.test('Error#escapeHtml with only special characters', () => {
  assertEquals(Core.Handler.escapeHtml('&<>"\''), '&amp;&lt;&gt;&quot;&#39;')
})

Deno.test('Error#extractError ignores an out-of-range statusCode carrier', () => {
  const carrier = Object.assign(new globalThis.Error('x'), { statusCode: 999 })
  assertEquals(Core.Handler.extractError(carrier).statusCode, 500)
})

Deno.test('Error#extractError maps Deno.errors.AlreadyExists to 409', () => {
  assertEquals(Core.Handler.extractError(new Deno.errors.AlreadyExists('x')).statusCode, 409)
})

Deno.test('Error#extractError maps Deno.errors.InvalidData to 400', () => {
  assertEquals(Core.Handler.extractError(new Deno.errors.InvalidData('x')).statusCode, 400)
})

Deno.test('Error#extractError maps Deno.errors.NotFound to 404', () => {
  assertEquals(Core.Handler.extractError(new Deno.errors.NotFound('x')).statusCode, 404)
})

Deno.test('Error#extractError maps Deno.errors.NotSupported to 501', () => {
  assertEquals(Core.Handler.extractError(new Deno.errors.NotSupported('x')).statusCode, 501)
})

Deno.test('Error#extractError maps Deno.errors.PermissionDenied to 403', () => {
  assertEquals(Core.Handler.extractError(new Deno.errors.PermissionDenied('x')).statusCode, 403)
})

Deno.test('Error#extractError maps Deno.errors.TimedOut to 504', () => {
  assertEquals(Core.Handler.extractError(new Deno.errors.TimedOut('x')).statusCode, 504)
})

Deno.test('Error#extractError maps a plain Error to 500', () => {
  assertEquals(Core.Handler.extractError(new globalThis.Error('boom')).statusCode, 500)
})

Deno.test('Error#extractError preserves a valid statusCode carrier', () => {
  const carrier = Object.assign(new globalThis.Error('teapot'), { statusCode: 418 })
  assertEquals(Core.Handler.extractError(carrier).statusCode, 418)
})

Deno.test('Error#extractError wraps a non-error value as 500', () => {
  const result = Core.Handler.extractError('plain string failure')
  assertEquals(result.statusCode, 500)
  assertEquals(result.error instanceof globalThis.Error, true)
  assertEquals(result.error.message, 'plain string failure')
})

Deno.test('Error#handleError omits errors when error has no structured cause', async () => {
  const request = new Request('http://localhost/x', {
    headers: new Headers({ Accept: 'application/json' })
  })
  const ctx = new Core.Context(request, new URL('http://localhost/x'), {})
  const res = await ctx.handleError(500, new globalThis.Error('boom'))
  assertEquals(res.status, 500)
  const body = (await res.json()) as { title: string; errors?: string[] }
  assertEquals(body.title, 'Internal Server Error')
  assertEquals('errors' in body, false)
})

Deno.test('Error#handleError surfaces validation reasons as problem+json errors', async () => {
  const request = new Request('http://localhost/users', {
    headers: new Headers({ Accept: 'application/json' })
  })
  const ctx = new Core.Context(request, new URL('http://localhost/users'), {})
  const validationError = Core.Handler.createStatusError(422, 'name must not be empty')
  Object.defineProperty(validationError, 'cause', {
    value: ['name must not be empty', 'email must contain @'],
    enumerable: false
  })
  const res = await ctx.handleError(422, validationError)
  assertEquals(res.status, 422)
  assertEquals(res.headers.get('Content-Type'), 'application/problem+json')
  const body = (await res.json()) as {
    type: string
    title: string
    status: number
    instance: string
    errors: string[]
  }
  assertEquals(body.type, 'about:blank')
  assertEquals(body.title, 'Unprocessable Entity')
  assertEquals(body.status, 422)
  assertEquals(body.instance, '/users')
  assertEquals(body.errors, ['name must not be empty', 'email must contain @'])
})
