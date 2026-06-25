import { assertEquals } from '@std/assert'
import * as Middleware from '@middleware/index.ts'
import Helper from '@tests/helper.ts'

Deno.test('Wrap apply maps a generic error to 500', async () => {
  const wrapped = Middleware.Wrap.apply('test', () => {
    throw new Error('boom')
  })
  const ctx = Helper.createTestContext('http://localhost/', { headers: { accept: 'text/html' } })
  const res = await wrapped(ctx, Helper.okNext)
  assertEquals(res?.status, 500)
})

Deno.test('Wrap apply passes through a successful middleware', async () => {
  const wrapped = Middleware.Wrap.apply('test', async (_ctx, next) => await next())
  const ctx = Helper.createTestContext()
  const res = await wrapped(ctx, Helper.okNext)
  assertEquals(await res?.text(), 'ok')
})

Deno.test('Wrap apply prefixes the label onto a status error', async () => {
  let captured: Error | null = null
  const ctx = Helper.createTestContext('http://localhost/', { headers: { accept: 'text/html' } })
  const errorCtx = new Proxy(ctx, {
    get(target, prop, receiver) {
      if (prop === 'handleError') {
        return (status: number, error: Error) => {
          captured = error
          return Reflect.get(target, prop, receiver).call(target, status, error)
        }
      }
      return Reflect.get(target, prop, receiver)
    }
  })
  const wrapped = Middleware.Wrap.apply('label', () => {
    throw new Deno.errors.InvalidData('bad')
  })
  await wrapped(errorCtx, Helper.okNext)
  assertEquals((captured as unknown as Error).message.startsWith('[label]'), true)
})

Deno.test('Wrap apply routes a thrown error through handleError', async () => {
  const wrapped = Middleware.Wrap.apply('test', () => {
    throw new Deno.errors.NotFound('missing')
  })
  const ctx = Helper.createTestContext('http://localhost/', { headers: { accept: 'text/html' } })
  const res = await wrapped(ctx, Helper.okNext)
  assertEquals(res?.status, 404)
})
