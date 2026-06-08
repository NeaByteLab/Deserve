import { assertEquals } from '@std/assert'
import * as Core from '@core/index.ts'
import * as Middleware from '@middleware/index.ts'

function createTestContext(url = 'http://localhost/', requestInit?: RequestInit): Core.Context {
  const request = new Request(url, requestInit)
  return new Core.Context(request, new URL(url), {})
}

Deno.test('csrf allows GET without any headers', async () => {
  const middleware = Middleware.Mware.csrf()
  const ctx = createTestContext('http://localhost/', { method: 'GET' })
  const res = await middleware(ctx, async () => new Response('ok'))
  assertEquals(await res?.text(), 'ok')
})

Deno.test('csrf allows HEAD and OPTIONS without headers', async () => {
  const middleware = Middleware.Mware.csrf()
  for (const method of ['HEAD', 'OPTIONS']) {
    const ctx = createTestContext('http://localhost/', { method })
    const res = await middleware(ctx, async () => new Response('ok'))
    assertEquals(await res?.text(), 'ok')
  }
})

Deno.test('csrf allows POST via Sec-Fetch-Site same-origin', async () => {
  const middleware = Middleware.Mware.csrf()
  const ctx = createTestContext('http://localhost/', {
    method: 'POST',
    headers: new Headers({ 'Sec-Fetch-Site': 'same-origin' })
  })
  const res = await middleware(ctx, async () => new Response('ok'))
  assertEquals(await res?.text(), 'ok')
})

Deno.test('csrf allows POST when Origin matches request origin even if Sec-Fetch-Site is cross-site', async () => {
  const middleware = Middleware.Mware.csrf()
  const ctx = createTestContext('http://localhost/', {
    method: 'POST',
    headers: new Headers({ Origin: 'http://localhost', 'Sec-Fetch-Site': 'cross-site' })
  })
  const res = await middleware(ctx, async () => new Response('ok'))
  assertEquals(await res?.text(), 'ok')
})

Deno.test('csrf allows configured Sec-Fetch-Site none', async () => {
  const middleware = Middleware.Mware.csrf({ secFetchSite: ['same-origin', 'none'] })
  const ctx = createTestContext('http://localhost/', {
    method: 'POST',
    headers: new Headers({ 'Sec-Fetch-Site': 'none' })
  })
  const res = await middleware(ctx, async () => new Response('ok'))
  assertEquals(await res?.text(), 'ok')
})

Deno.test('csrf allows same-origin POST via Origin header', async () => {
  const middleware = Middleware.Mware.csrf()
  const ctx = createTestContext('http://localhost/', {
    method: 'POST',
    headers: new Headers({ Origin: 'http://localhost' })
  })
  const res = await middleware(ctx, async () => new Response('ok'))
  assertEquals(await res?.text(), 'ok')
})

Deno.test('csrf blocks POST with Sec-Fetch-Site cross-site by default', async () => {
  const middleware = Middleware.Mware.csrf()
  const ctx = createTestContext('http://localhost/', {
    method: 'POST',
    headers: new Headers({ 'Sec-Fetch-Site': 'cross-site' })
  })
  const res = await middleware(ctx, async () => new Response('ok'))
  assertEquals(res?.status, 403)
})

Deno.test('csrf blocks POST with Sec-Fetch-Site none by default', async () => {
  const middleware = Middleware.Mware.csrf()
  const ctx = createTestContext('http://localhost/', {
    method: 'POST',
    headers: new Headers({ 'Sec-Fetch-Site': 'none' })
  })
  const res = await middleware(ctx, async () => new Response('ok'))
  assertEquals(res?.status, 403)
})

Deno.test('csrf blocks cross-origin POST with evil Origin', async () => {
  const middleware = Middleware.Mware.csrf()
  const ctx = createTestContext('http://localhost/', {
    method: 'POST',
    headers: new Headers({ Origin: 'http://evil.example' })
  })
  const res = await middleware(ctx, async () => new Response('ok'))
  assertEquals(res?.status, 403)
})

Deno.test('csrf blocks unsafe POST with no Origin and no Sec-Fetch-Site', async () => {
  const middleware = Middleware.Mware.csrf()
  const ctx = createTestContext('http://localhost/', { method: 'POST' })
  const res = await middleware(ctx, async () => new Response('ok'))
  assertEquals(res?.status, 403)
})

Deno.test('csrf gates all unsafe methods identically', async () => {
  const middleware = Middleware.Mware.csrf()
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    const blocked = createTestContext('http://localhost/', { method })
    assertEquals((await middleware(blocked, async () => new Response('ok')))?.status, 403)
    const allowed = createTestContext('http://localhost/', {
      method,
      headers: new Headers({ Origin: 'http://localhost' })
    })
    assertEquals(await (await middleware(allowed, async () => new Response('ok')))?.text(), 'ok')
  }
})

Deno.test('csrf origin as array matches and rejects', async () => {
  const middleware = Middleware.Mware.csrf({
    origin: ['https://a.example', 'https://b.example']
  })
  const okCtx = createTestContext('http://localhost/', {
    method: 'POST',
    headers: new Headers({ Origin: 'https://b.example' })
  })
  assertEquals(await (await middleware(okCtx, async () => new Response('ok')))?.text(), 'ok')
  const badCtx = createTestContext('http://localhost/', {
    method: 'POST',
    headers: new Headers({ Origin: 'https://c.example' })
  })
  assertEquals((await middleware(badCtx, async () => new Response('ok')))?.status, 403)
})

Deno.test('csrf origin as function receives value and context', async () => {
  let sawContext = false
  const middleware = Middleware.Mware.csrf({
    origin: (origin, ctx) => {
      sawContext = ctx instanceof Core.Context
      return origin.endsWith('.trusted.example')
    }
  })
  const okCtx = createTestContext('http://localhost/', {
    method: 'POST',
    headers: new Headers({ Origin: 'https://sub.trusted.example' })
  })
  const res = await middleware(okCtx, async () => new Response('ok'))
  assertEquals(await res?.text(), 'ok')
  assertEquals(sawContext, true)
  const badCtx = createTestContext('http://localhost/', {
    method: 'POST',
    headers: new Headers({ Origin: 'https://evil.example' })
  })
  assertEquals((await middleware(badCtx, async () => new Response('ok')))?.status, 403)
})

Deno.test('csrf origin as string matches and rejects', async () => {
  const middleware = Middleware.Mware.csrf({ origin: 'https://app.example' })
  const okCtx = createTestContext('http://localhost/', {
    method: 'POST',
    headers: new Headers({ Origin: 'https://app.example' })
  })
  assertEquals(await (await middleware(okCtx, async () => new Response('ok')))?.text(), 'ok')
  const badCtx = createTestContext('http://localhost/', {
    method: 'POST',
    headers: new Headers({ Origin: 'https://other.example' })
  })
  assertEquals((await middleware(badCtx, async () => new Response('ok')))?.status, 403)
})

Deno.test('csrf rejects non-boolean truthy validator return values', async () => {
  const middleware = Middleware.Mware.csrf({
    origin: (() => 'yes') as unknown as (origin: string) => boolean
  })
  const ctx = createTestContext('http://localhost/', {
    method: 'POST',
    headers: new Headers({ Origin: 'http://localhost' })
  })
  const res = await middleware(ctx, async () => new Response('ok'))
  assertEquals(res?.status, 403)
})

Deno.test('csrf secFetchSite as function controls access', async () => {
  const middleware = Middleware.Mware.csrf({
    secFetchSite: (value) => value === 'same-site'
  })
  const okCtx = createTestContext('http://localhost/', {
    method: 'POST',
    headers: new Headers({ 'Sec-Fetch-Site': 'same-site' })
  })
  assertEquals(await (await middleware(okCtx, async () => new Response('ok')))?.text(), 'ok')
  const badCtx = createTestContext('http://localhost/', {
    method: 'POST',
    headers: new Headers({ 'Sec-Fetch-Site': 'same-origin' })
  })
  assertEquals((await middleware(badCtx, async () => new Response('ok')))?.status, 403)
})

Deno.test('csrf throwing origin validator still allows Sec-Fetch-Site fallback', async () => {
  const middleware = Middleware.Mware.csrf({
    origin: () => {
      throw new Error('boom in user origin fn')
    }
  })
  const ctx = createTestContext('http://localhost/', {
    method: 'POST',
    headers: new Headers({ Origin: 'http://evil.example', 'Sec-Fetch-Site': 'same-origin' })
  })
  const res = await middleware(ctx, async () => new Response('ok'))
  assertEquals(await res?.text(), 'ok')
})

Deno.test('csrf treats a throwing origin validator as a failed check (403 not 500)', async () => {
  const middleware = Middleware.Mware.csrf({
    origin: () => {
      throw new Error('boom in user origin fn')
    }
  })
  const ctx = createTestContext('http://localhost/', {
    method: 'POST',
    headers: new Headers({ Origin: 'http://localhost' })
  })
  const res = await middleware(ctx, async () => new Response('ok'))
  assertEquals(res?.status, 403)
})

Deno.test('csrf treats a throwing secFetchSite validator as a failed check', async () => {
  const middleware = Middleware.Mware.csrf({
    secFetchSite: () => {
      throw new Error('boom in user sec fn')
    }
  })
  const ctx = createTestContext('http://localhost/', {
    method: 'POST',
    headers: new Headers({ 'Sec-Fetch-Site': 'same-origin' })
  })
  const res = await middleware(ctx, async () => new Response('ok'))
  assertEquals(res?.status, 403)
})
