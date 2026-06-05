import { assertEquals } from '@std/assert'
import * as Core from '@core/index.ts'
import * as Middleware from '@middleware/index.ts'

function createTestContext(url = 'http://localhost/', requestInit?: RequestInit): Core.Context {
  const request = new Request(url, requestInit)
  return new Core.Context(request, new URL(url), {})
}

Deno.test('securityHeaders calls next and returns response', async () => {
  const middleware = Middleware.Mware.securityHeaders({
    xFrameOptions: 'DENY'
  })
  const ctx = createTestContext()
  const next = async (): Promise<Response> => new Response('protected', { status: 200 })
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(res.status, 200)
    assertEquals(await res.text(), 'protected')
  }
  assertEquals(ctx.responseHeadersMap['X-Frame-Options'], 'DENY')
})

Deno.test('securityHeaders can set multiple headers', async () => {
  const middleware = Middleware.Mware.securityHeaders({
    referrerPolicy: 'strict-origin-when-cross-origin',
    xFrameOptions: 'DENY'
  })
  const ctx = createTestContext()
  const next = async (): Promise<Response> => new Response()
  await middleware(ctx, next)
  assertEquals(ctx.responseHeadersMap['Referrer-Policy'], 'strict-origin-when-cross-origin')
  assertEquals(ctx.responseHeadersMap['X-Frame-Options'], 'DENY')
})

Deno.test('securityHeaders only specified headers are set others use defaults', async () => {
  const middleware = Middleware.Mware.securityHeaders({
    xContentTypeOptions: 'nosniff'
  })
  const ctx = createTestContext()
  const next = async (): Promise<Response> => new Response()
  await middleware(ctx, next)
  assertEquals(ctx.responseHeadersMap['X-Content-Type-Options'], 'nosniff')
  assertEquals(ctx.responseHeadersMap['Content-Security-Policy'], undefined)
  assertEquals(ctx.responseHeadersMap['Cross-Origin-Embedder-Policy'], undefined)
  assertEquals(ctx.responseHeadersMap['Cross-Origin-Opener-Policy'], 'same-origin')
  assertEquals(ctx.responseHeadersMap['Cross-Origin-Resource-Policy'], 'same-origin')
  assertEquals(ctx.responseHeadersMap['Origin-Agent-Cluster'], '?1')
  assertEquals(ctx.responseHeadersMap['Referrer-Policy'], 'no-referrer')
  assertEquals(ctx.responseHeadersMap['Strict-Transport-Security'], undefined)
  assertEquals(ctx.responseHeadersMap['X-DNS-Prefetch-Control'], 'off')
  assertEquals(ctx.responseHeadersMap['X-Download-Options'], 'noopen')
  assertEquals(ctx.responseHeadersMap['X-Frame-Options'], 'SAMEORIGIN')
  assertEquals(ctx.responseHeadersMap['X-Permitted-Cross-Domain-Policies'], 'none')
  assertEquals(ctx.responseHeadersMap['X-Powered-By'], undefined)
})

Deno.test('securityHeaders sets all 13 headers when provided', async () => {
  const middleware = Middleware.Mware.securityHeaders({
    contentSecurityPolicy: "default-src 'self'",
    crossOriginEmbedderPolicy: 'require-corp',
    crossOriginOpenerPolicy: 'same-origin',
    crossOriginResourcePolicy: 'same-origin',
    originAgentCluster: '?1',
    referrerPolicy: 'no-referrer',
    strictTransportSecurity: 'max-age=31536000',
    xContentTypeOptions: 'nosniff',
    xDnsPrefetchControl: 'off',
    xDownloadOptions: 'noopen',
    xFrameOptions: 'SAMEORIGIN',
    xPermittedCrossDomainPolicies: 'none',
    xPoweredBy: 'Deserve'
  })
  const ctx = createTestContext()
  const next = async (): Promise<Response> => new Response()
  await middleware(ctx, next)
  assertEquals(ctx.responseHeadersMap['Content-Security-Policy'], "default-src 'self'")
  assertEquals(ctx.responseHeadersMap['Cross-Origin-Embedder-Policy'], 'require-corp')
  assertEquals(ctx.responseHeadersMap['Cross-Origin-Opener-Policy'], 'same-origin')
  assertEquals(ctx.responseHeadersMap['Cross-Origin-Resource-Policy'], 'same-origin')
  assertEquals(ctx.responseHeadersMap['Origin-Agent-Cluster'], '?1')
  assertEquals(ctx.responseHeadersMap['Referrer-Policy'], 'no-referrer')
  assertEquals(ctx.responseHeadersMap['Strict-Transport-Security'], 'max-age=31536000')
  assertEquals(ctx.responseHeadersMap['X-Content-Type-Options'], 'nosniff')
  assertEquals(ctx.responseHeadersMap['X-DNS-Prefetch-Control'], 'off')
  assertEquals(ctx.responseHeadersMap['X-Download-Options'], 'noopen')
  assertEquals(ctx.responseHeadersMap['X-Frame-Options'], 'SAMEORIGIN')
  assertEquals(ctx.responseHeadersMap['X-Permitted-Cross-Domain-Policies'], 'none')
  assertEquals(ctx.responseHeadersMap['X-Powered-By'], 'Deserve')
})

Deno.test('securityHeaders sets configured header and calls next', async () => {
  const middleware = Middleware.Mware.securityHeaders({ xContentTypeOptions: 'nosniff' })
  const ctx = createTestContext()
  const next = async (): Promise<Response> => new Response('ok')
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(res.status, 200)
    assertEquals(await res.text(), 'ok')
  }
  assertEquals(ctx.responseHeadersMap['X-Content-Type-Options'], 'nosniff')
})

Deno.test('securityHeaders sets Content-Security-Policy', async () => {
  const middleware = Middleware.Mware.securityHeaders({
    contentSecurityPolicy: "default-src 'self'"
  })
  const ctx = createTestContext()
  const next = async (): Promise<Response> => new Response()
  await middleware(ctx, next)
  assertEquals(ctx.responseHeadersMap['Content-Security-Policy'], "default-src 'self'")
})

Deno.test('securityHeaders sets Strict-Transport-Security', async () => {
  const middleware = Middleware.Mware.securityHeaders({
    strictTransportSecurity: 'max-age=31536000; includeSubDomains'
  })
  const ctx = createTestContext()
  const next = async (): Promise<Response> => new Response()
  await middleware(ctx, next)
  assertEquals(
    ctx.responseHeadersMap['Strict-Transport-Security'],
    'max-age=31536000; includeSubDomains'
  )
})

Deno.test('securityHeaders with default options sets secure defaults', async () => {
  const middleware = Middleware.Mware.securityHeaders()
  const ctx = createTestContext()
  const next = async (): Promise<Response> => new Response()
  await middleware(ctx, next)
  assertEquals(ctx.responseHeadersMap['Content-Security-Policy'], undefined)
  assertEquals(ctx.responseHeadersMap['Cross-Origin-Embedder-Policy'], undefined)
  assertEquals(ctx.responseHeadersMap['Cross-Origin-Opener-Policy'], 'same-origin')
  assertEquals(ctx.responseHeadersMap['Cross-Origin-Resource-Policy'], 'same-origin')
  assertEquals(ctx.responseHeadersMap['Origin-Agent-Cluster'], '?1')
  assertEquals(ctx.responseHeadersMap['Referrer-Policy'], 'no-referrer')
  assertEquals(ctx.responseHeadersMap['Strict-Transport-Security'], undefined)
  assertEquals(ctx.responseHeadersMap['X-Content-Type-Options'], 'nosniff')
  assertEquals(ctx.responseHeadersMap['X-DNS-Prefetch-Control'], 'off')
  assertEquals(ctx.responseHeadersMap['X-Download-Options'], 'noopen')
  assertEquals(ctx.responseHeadersMap['X-Frame-Options'], 'SAMEORIGIN')
  assertEquals(ctx.responseHeadersMap['X-Permitted-Cross-Domain-Policies'], 'none')
  assertEquals(ctx.responseHeadersMap['X-Powered-By'], undefined)
})

Deno.test('securityHeaders with mixed true and false values', async () => {
  const middleware = Middleware.Mware.securityHeaders({
    xContentTypeOptions: 'nosniff',
    xFrameOptions: false,
    referrerPolicy: 'no-referrer'
  })
  const ctx = createTestContext()
  const next = async (): Promise<Response> => new Response()
  await middleware(ctx, next)
  assertEquals(ctx.responseHeadersMap['X-Content-Type-Options'], 'nosniff')
  assertEquals(ctx.responseHeadersMap['X-Frame-Options'], undefined)
  assertEquals(ctx.responseHeadersMap['Referrer-Policy'], 'no-referrer')
})

Deno.test('securityHeaders with option false does not set header', async () => {
  const middleware = Middleware.Mware.securityHeaders({ xContentTypeOptions: false })
  const ctx = createTestContext()
  const next = async (): Promise<Response> => new Response()
  await middleware(ctx, next)
  assertEquals(ctx.responseHeadersMap['X-Content-Type-Options'], undefined)
})

Deno.test('securityHeaders xPoweredBy overrides default server identity', async () => {
  const middleware = Middleware.Mware.securityHeaders({
    xPoweredBy: 'CustomServer'
  })
  const ctx = createTestContext()
  const next = async (): Promise<Response> => new Response()
  await middleware(ctx, next)
  assertEquals(ctx.responseHeadersMap['X-Powered-By'], 'CustomServer')
})
