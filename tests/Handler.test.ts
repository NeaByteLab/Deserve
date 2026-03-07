import { assertEquals } from 'jsr:@std/assert'
import { Context, Handler } from '@app/index.ts'

function createTestContext(url: string, requestInit?: RequestInit): Context {
  const request = new Request(url, requestInit)
  return new Context(request, new URL(url), {})
}

Deno.test('Handler#createPattern [id] -> :id', () => {
  const handler = new Handler()
  assertEquals(handler.createPattern('items/[id].ts'), '/items/:id')
  assertEquals(handler.createPattern('items/[id]/edit.tsx'), '/items/:id/edit')
})

Deno.test('Handler#createPattern index -> /', () => {
  const handler = new Handler()
  assertEquals(handler.createPattern('index.ts'), '/')
  assertEquals(handler.createPattern('index.tsx'), '/')
  assertEquals(handler.createPattern('Index.TS'), '/')
  assertEquals(handler.createPattern('items/Index.tsx'), '/items')
})

Deno.test('Handler#createPattern invalid extension returns null', () => {
  const handler = new Handler()
  assertEquals(handler.createPattern('readme.md'), null)
})

Deno.test('Handler#createPattern nested index', () => {
  const handler = new Handler()
  assertEquals(handler.createPattern('items/index.ts'), '/items')
})

Deno.test('Handler#createPattern skips @ and _ segments', () => {
  const handler = new Handler()
  assertEquals(handler.createPattern('@components/foo.ts'), null)
  assertEquals(handler.createPattern('_layout.ts'), null)
})

Deno.test('Handler#handleResponse when errorMiddleware returns custom uses it', async () => {
  const handler = new Handler()
  handler.setErrorMiddleware(async (_ctx, errorInfo) => {
    return new Response(`custom ${errorInfo.statusCode}`, {
      status: errorInfo.statusCode,
      headers: new Headers({ 'X-Custom': 'yes' })
    })
  })
  const ctx = createTestContext('http://localhost/', {
    headers: new Headers({ Accept: 'application/json' })
  })
  const res = await handler.handleResponse(ctx, 404, new Error('gone'))
  assertEquals(res.status, 404)
  assertEquals(res.headers.get('X-Custom'), 'yes')
  assertEquals(await res.text(), 'custom 404')
})

Deno.test('Handler#handleResponse when errorMiddleware returns null uses default', async () => {
  const handler = new Handler()
  handler.setErrorMiddleware(async () => null)
  const ctx = createTestContext('http://localhost/bar', {
    headers: new Headers({ Accept: 'application/json' })
  })
  const res = await handler.handleResponse(ctx, 404, new Error('Not found'))
  assertEquals(res.status, 404)
  const body = (await res.json()) as { error: string; path: string; statusCode: number }
  assertEquals(body.statusCode, 404)
  assertEquals(body.path, '/bar')
})

Deno.test('Handler#handleResponse with Accept application/json returns JSON', async () => {
  const handler = new Handler()
  const ctx = createTestContext('http://localhost/foo', {
    headers: new Headers({ Accept: 'application/json' })
  })
  const res = await handler.handleResponse(ctx, 404, new Error('Not found'))
  assertEquals(res.status, 404)
  assertEquals(res.headers.get('Content-Type'), 'application/json')
  const responseBody = (await res.json()) as { error: string; path: string; statusCode: number }
  assertEquals(responseBody.error, 'Not found')
  assertEquals(responseBody.path, '/foo')
  assertEquals(responseBody.statusCode, 404)
})

Deno.test(
  'Handler#handleResponse without JSON Accept returns HTML and escapes message',
  async () => {
    const handler = new Handler()
    const ctx = createTestContext('http://localhost/')
    const res = await handler.handleResponse(ctx, 500, new Error('Bad <script>'))
    assertEquals(res.status, 500)
    assertEquals(res.headers.get('Content-Type'), 'text/html')
    const html = await res.text()
    assertEquals(html.includes('500'), true)
    assertEquals(html.includes('&lt;script&gt;'), true)
    assertEquals(html.includes('<script>'), false)
  }
)

Deno.test('Handler#validateModule throws when no HTTP method exported', () => {
  const handler = new Handler()
  let thrown = false
  try {
    handler.validateModule({ default: () => {} }, 'routes/foo.ts')
  } catch (e) {
    thrown = true
    assertEquals((e as Error).message.includes('Must export at least one HTTP method'), true)
  }
  assertEquals(thrown, true)
})

Deno.test('Handler#validateModule throws when method is not function', () => {
  const handler = new Handler()
  let thrown = false
  try {
    handler.validateModule({ GET: 'not a function' }, 'routes/foo.ts')
  } catch (e) {
    thrown = true
    assertEquals((e as Error).message.includes('must be a function'), true)
  }
  assertEquals(thrown, true)
})
