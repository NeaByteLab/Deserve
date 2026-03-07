import { assertEquals } from 'jsr:@std/assert'
import { Context, ErrorHelpers } from '@app/index.ts'

Deno.test(
  'ErrorHelpers#buildResponse with errorMiddleware returning null uses default',
  async () => {
    const request = new Request('http://localhost/bar', {
      headers: new Headers({ Accept: 'application/json' })
    })
    const ctx = new Context(request, new URL('http://localhost/bar'), {})
    const res = await ErrorHelpers.buildResponse(ctx, 502, new Error('bad'), async () => null)
    assertEquals(res.status, 502)
    const body = (await res.json()) as { error: string }
    assertEquals(body.error, 'bad')
  }
)

Deno.test(
  'ErrorHelpers#buildResponse with errorMiddleware returning response uses it',
  async () => {
    const request = new Request('http://localhost/')
    const ctx = new Context(request, new URL('http://localhost/'), {})
    const customRes = new Response('custom body', { status: 499 })
    const res = await ErrorHelpers.buildResponse(ctx, 500, new Error('x'), async () => customRes)
    assertEquals(res, customRes)
    assertEquals(await res.text(), 'custom body')
    assertEquals(res.status, 499)
  }
)

Deno.test(
  'ErrorHelpers#buildResponse without errorMiddleware returns HTML when no Accept json',
  async () => {
    const request = new Request('http://localhost/')
    const ctx = new Context(request, new URL('http://localhost/'), {})
    const res = await ErrorHelpers.buildResponse(ctx, 500, new Error('oops'), null)
    assertEquals(res.status, 500)
    assertEquals(res.headers.get('Content-Type'), 'text/html')
    const html = await res.text()
    assertEquals(html.includes('500'), true)
    assertEquals(html.includes('oops'), true)
  }
)

Deno.test(
  'ErrorHelpers#buildResponse without errorMiddleware returns JSON when Accept json',
  async () => {
    const request = new Request('http://localhost/foo', {
      headers: new Headers({ Accept: 'application/json' })
    })
    const ctx = new Context(request, new URL('http://localhost/foo'), {})
    const res = await ErrorHelpers.buildResponse(ctx, 404, new Error('gone'), null)
    assertEquals(res.status, 404)
    assertEquals(res.headers.get('Content-Type'), 'application/json')
    const body = (await res.json()) as { error: string; path: string; statusCode: number }
    assertEquals(body.error, 'gone')
    assertEquals(body.path, '/foo')
    assertEquals(body.statusCode, 404)
  }
)

Deno.test('ErrorHelpers#defaultErrorHtml includes status and escaped message', () => {
  const html = ErrorHelpers.defaultErrorHtml(404, 'Not <found>')
  assertEquals(html.includes('404'), true)
  assertEquals(html.includes('&lt;found&gt;'), true)
  assertEquals(html.includes('<found>'), false)
})

Deno.test('ErrorHelpers#escapeHtml escapes &, <, >', () => {
  assertEquals(ErrorHelpers.escapeHtml('a & b'), 'a &amp; b')
  assertEquals(ErrorHelpers.escapeHtml('<script>'), '&lt;script&gt;')
  assertEquals(ErrorHelpers.escapeHtml('x > 0'), 'x &gt; 0')
  assertEquals(ErrorHelpers.escapeHtml('"quoted"'), '"quoted"')
})
