import type * as Types from '@interfaces/index.ts'
import { assertEquals } from '@std/assert'
import * as Core from '@core/index.ts'

function fileUrlToPath(fileUrl: string): string {
  const decoded = decodeURIComponent(new URL(fileUrl).pathname)
  if (/^\/[A-Za-z]:/.test(decoded)) {
    return decoded.slice(1)
  }
  return decoded
}

Deno.test('Handler#appendCookies appends every value as a distinct Set-Cookie header', () => {
  const headers = new Headers()
  Core.Handler.appendCookies(headers, ['a=1', 'b=2'])
  const setCookies = headers.getSetCookie()
  assertEquals(setCookies.length, 2)
  assertEquals(setCookies.includes('a=1'), true)
  assertEquals(setCookies.includes('b=2'), true)
})

Deno.test('Handler#appendCookies with an empty list leaves headers untouched', () => {
  const headers = new Headers()
  Core.Handler.appendCookies(headers, [])
  assertEquals(headers.getSetCookie().length, 0)
})

Deno.test('Handler#createStatusError attaches an immutable statusCode property', () => {
  const error = Core.Handler.createStatusError(404, 'missing')
  assertEquals(error.statusCode, 404)
  assertEquals(error.message, 'missing')
  assertEquals(error instanceof Error, true)
})

Deno.test('Handler#createStatusError statusCode cannot be reassigned', () => {
  const error = Core.Handler.createStatusError(403, 'forbidden')
  let threw = false
  try {
    ;(error as { statusCode: number }).statusCode = 500
  } catch {
    threw = true
  }
  assertEquals(threw, true)
  assertEquals(error.statusCode, 403)
})

Deno.test('Handler#isDirectory returns false for a non-existent path', () => {
  assertEquals(Core.Handler.isDirectory('/nonexistent-dir-' + Date.now()), false)
})

Deno.test('Handler#isDirectory returns false when the path is a file', () => {
  const filePath = fileUrlToPath(import.meta.url)
  assertEquals(Core.Handler.isDirectory(filePath), false)
})

Deno.test('Handler#isDirectory returns true for an existing directory', () => {
  const dirPath = fileUrlToPath(new URL('.', import.meta.url).href)
  assertEquals(Core.Handler.isDirectory(dirPath), true)
})

Deno.test('Handler#problemDetails builds an RFC 9457 body with instance', () => {
  const body = Core.Handler.problemDetails(422, '/users')
  assertEquals(body.type, 'about:blank')
  assertEquals(body.title, 'Unprocessable Entity')
  assertEquals(body.status, 422)
  assertEquals(body.instance, '/users')
})

Deno.test('Handler#problemDetails includes errors extension when reasons exist', () => {
  const body = Core.Handler.problemDetails(422, '/users', undefined, [
    'name must not be empty',
    'email must contain @'
  ])
  assertEquals(body.status, 422)
  assertEquals(body.errors, ['name must not be empty', 'email must contain @'])
})

Deno.test('Handler#problemDetails omits errors when reasons are empty', () => {
  const body = Core.Handler.problemDetails(422, '/users', undefined, [])
  assertEquals('errors' in body, false)
})

Deno.test('Handler#problemDetails omits instance when pathname is undefined', () => {
  const body = Core.Handler.problemDetails(500)
  assertEquals(body.title, 'Internal Server Error')
  assertEquals(body.status, 500)
  assertEquals('instance' in body, false)
})

Deno.test('Handler#safeMessage falls back to Bad Request for an unmapped 4xx status', () => {
  assertEquals(Core.Handler.safeMessage(418), 'Bad Request')
})

Deno.test('Handler#safeMessage falls back to Internal Server Error for an unmapped 5xx status', () => {
  assertEquals(Core.Handler.safeMessage(599), 'Internal Server Error')
})

Deno.test('Handler#safeMessage returns the known message for a mapped status', () => {
  assertEquals(Core.Handler.safeMessage(404), 'Not Found')
  assertEquals(Core.Handler.safeMessage(500), 'Internal Server Error')
})

Deno.test('Handler#safeReasons does not leak cause from non-validation errors', () => {
  const leaky = new Error('db failed', { cause: ['SECRET host=10.0.0.5', 'password'] })
  assertEquals(Core.Handler.safeReasons(leaky), undefined)
})

Deno.test('Handler#safeReasons extracts string-array cause from a 422 status error', () => {
  const error = Core.Handler.createStatusError(422, 'invalid')
  Object.defineProperty(error, 'cause', { value: ['a', 'b'], enumerable: false })
  assertEquals(Core.Handler.safeReasons(error), ['a', 'b'])
})

Deno.test('Handler#safeReasons ignores cause on non-422 status errors', () => {
  const error = Core.Handler.createStatusError(400, 'bad')
  Object.defineProperty(error, 'cause', { value: ['leak'], enumerable: false })
  assertEquals(Core.Handler.safeReasons(error), undefined)
})

Deno.test('Handler#safeReasons returns undefined for null or non-array cause', () => {
  assertEquals(Core.Handler.safeReasons(null), undefined)
  assertEquals(Core.Handler.safeReasons(new Error('x')), undefined)
  const plain = Core.Handler.createStatusError(422, 'x')
  Object.defineProperty(plain, 'cause', { value: 'plain', enumerable: false })
  assertEquals(Core.Handler.safeReasons(plain), undefined)
})

Deno.test('Handler#stateKey returns the raw key value', () => {
  const key: Types.StateKey<number> = Core.Handler.stateKey<number>('custom')
  assertEquals(key, 'custom')
})

Deno.test('Handler#stateKeys exposes the well-known framework keys as branded strings', () => {
  assertEquals(Core.Handler.stateKeys.view, 'view')
  assertEquals(Core.Handler.stateKeys.worker, 'worker')
  assertEquals(Core.Handler.stateKeys.session, 'session')
  assertEquals(Core.Handler.stateKeys.setSession, 'setSession')
  assertEquals(Core.Handler.stateKeys.clearSession, 'clearSession')
})

Deno.test('Handler#wantsJson is false when Accept does not include application/json', () => {
  const headers = new Headers({ Accept: 'text/html' })
  assertEquals(Core.Handler.wantsJson(headers), false)
})

Deno.test('Handler#wantsJson is false when no Accept header is present', () => {
  assertEquals(Core.Handler.wantsJson(new Headers()), false)
})

Deno.test('Handler#wantsJson is true when Accept includes application/json', () => {
  const headers = new Headers({ Accept: 'application/json, text/plain' })
  assertEquals(Core.Handler.wantsJson(headers), true)
})

Deno.test('Handler#wantsJson is true when Accept includes application/problem+json', () => {
  const headers = new Headers({ Accept: 'application/problem+json' })
  assertEquals(Core.Handler.wantsJson(headers), true)
})
