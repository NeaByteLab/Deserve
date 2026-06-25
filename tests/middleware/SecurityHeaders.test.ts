import { assertEquals } from '@std/assert'
import * as Middleware from '@middleware/index.ts'
import Helper from '@tests/helper.ts'

Deno.test('SecurityHeaders create applies default headers', async () => {
  const mw = Middleware.SecurityHeaders.create()
  const ctx = Helper.createTestContext()
  await mw(ctx, Helper.okNext)
  const res = ctx.send.text('x')
  assertEquals(res.headers.get('x-content-type-options'), 'nosniff')
  assertEquals(res.headers.get('x-frame-options'), 'SAMEORIGIN')
  assertEquals(res.headers.get('referrer-policy'), 'no-referrer')
})

Deno.test('SecurityHeaders create omits a disabled header', async () => {
  const mw = Middleware.SecurityHeaders.create({ xFrameOptions: false })
  const ctx = Helper.createTestContext()
  await mw(ctx, Helper.okNext)
  const res = ctx.send.text('x')
  assertEquals(res.headers.get('x-frame-options'), null)
})

Deno.test('SecurityHeaders create overrides a header value', async () => {
  const mw = Middleware.SecurityHeaders.create({ xFrameOptions: 'DENY' })
  const ctx = Helper.createTestContext()
  await mw(ctx, Helper.okNext)
  const res = ctx.send.text('x')
  assertEquals(res.headers.get('x-frame-options'), 'DENY')
})

Deno.test('SecurityHeaders create sets an optional header when provided', async () => {
  const mw = Middleware.SecurityHeaders.create({
    contentSecurityPolicy: "default-src 'self'"
  })
  const ctx = Helper.createTestContext()
  await mw(ctx, Helper.okNext)
  const res = ctx.send.text('x')
  assertEquals(res.headers.get('content-security-policy'), "default-src 'self'")
})

Deno.test('SecurityHeaders create skips null-default optional headers', async () => {
  const mw = Middleware.SecurityHeaders.create()
  const ctx = Helper.createTestContext()
  await mw(ctx, Helper.okNext)
  const res = ctx.send.text('x')
  assertEquals(res.headers.get('content-security-policy'), null)
})
