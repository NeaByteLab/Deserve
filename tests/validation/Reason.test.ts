import { assertEquals } from '@std/assert'
import * as Core from '@core/index.ts'
import * as Validation from '@validation/index.ts'

Deno.test('Reason.toStatusError empty cause array uses generic message', () => {
  const error = new Error('original')
  error.cause = []
  const statusError = Validation.Reason.toStatusError(error)
  assertEquals(statusError.statusCode, 422)
  assertEquals(statusError.message, 'Validation failed')
  assertEquals(statusError.cause, [])
})

Deno.test('Reason.toStatusError filters non-string cause members', () => {
  const error = new Error('original')
  error.cause = ['valid', 1, null, 'also valid']
  const statusError = Validation.Reason.toStatusError(error)
  assertEquals(statusError.cause, ['valid', 'also valid'])
  assertEquals(statusError.message, 'valid; also valid')
})

Deno.test('Reason.toStatusError joins string reasons into message', () => {
  const error = new Error('original')
  error.cause = ['name required', 'age too low']
  const statusError = Validation.Reason.toStatusError(error)
  assertEquals(statusError.statusCode, 422)
  assertEquals(statusError.message, 'name required; age too low')
  assertEquals(statusError.cause, ['name required', 'age too low'])
})

Deno.test('Reason.toStatusError maps non-error value to generic 422', () => {
  const statusError = Validation.Reason.toStatusError('not an error')
  assertEquals(statusError.statusCode, 422)
  assertEquals(statusError.message, 'Unprocessable request input')
})

Deno.test('Reason.toStatusError maps plain error to generic 422 without cause', () => {
  const error = new Error('Cannot read properties of null')
  const statusError = Validation.Reason.toStatusError(error)
  assertEquals(statusError.statusCode, 422)
  assertEquals(statusError.message, 'Unprocessable request input')
  assertEquals('cause' in statusError && Array.isArray(statusError.cause), false)
})

Deno.test('Reason.toStatusError passes through an error that already carries a status', () => {
  const original = Core.Handler.createStatusError(400, 'Malformed or unreadable request body')
  const statusError = Validation.Reason.toStatusError(original)
  assertEquals(statusError, original)
  assertEquals(statusError.statusCode, 400)
})

Deno.test('Reason.toStatusError sets non-enumerable cause', () => {
  const error = new Error('original')
  error.cause = ['reason']
  const statusError = Validation.Reason.toStatusError(error)
  assertEquals(Object.prototype.propertyIsEnumerable.call(statusError, 'cause'), false)
})

Deno.test('Reason.toStatusError uses error pipeline status carrier', () => {
  const error = new Error('original')
  error.cause = ['reason']
  const statusError = Validation.Reason.toStatusError(error)
  assertEquals(Core.Handler.isErrorWithStatus(statusError), true)
})
