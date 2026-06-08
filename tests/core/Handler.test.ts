import type * as Types from '@interfaces/index.ts'
import { assertEquals } from '@std/assert'
import * as Core from '@core/index.ts'

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
  const filePath = new URL(import.meta.url).pathname
  assertEquals(Core.Handler.isDirectory(filePath), false)
})

Deno.test('Handler#isDirectory returns true for an existing directory', () => {
  const dirPath = new URL('.', import.meta.url).pathname
  assertEquals(Core.Handler.isDirectory(dirPath), true)
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
