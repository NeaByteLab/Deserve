import { assertEquals } from 'jsr:@std/assert'
import * as Core from '@core/index.ts'

const baseHeaders = { 'X-App': 'test' }
const buildRedirect = (url: string, status: number): globalThis.Response =>
  new globalThis.Response(null, { status, headers: new Headers({ Location: url }) })
const send = Core.Response.create(baseHeaders, buildRedirect)

Deno.test('Response#create custom merges base headers and options', async () => {
  const res = send.custom('body', { status: 201, headers: { 'X-Custom': 'y' } })
  assertEquals(res.status, 201)
  assertEquals(res.headers.get('X-App'), 'test')
  assertEquals(res.headers.get('X-Custom'), 'y')
  assertEquals(await res.text(), 'body')
})

Deno.test('Response#create custom options.headers overrides base', () => {
  const res = send.custom(null, { headers: { 'X-App': 'override' } })
  assertEquals(res.headers.get('X-App'), 'override')
})

Deno.test('Response#create data sets Content-Disposition and Content-Type', () => {
  const res = send.data(new TextEncoder().encode('data'), 'file.bin', undefined, 'application/pdf')
  assertEquals(res.headers.get('Content-Type'), 'application/pdf')
  assertEquals(res.headers.get('Content-Disposition'), 'attachment; filename="file.bin"')
  assertEquals(res.headers.get('Content-Length'), '4')
  assertEquals(res.headers.get('X-App'), 'test')
})

Deno.test('Response#create data string sets Content-Length', () => {
  const res = send.data('hello', 'a.txt')
  assertEquals(res.headers.get('Content-Length'), '5')
  assertEquals(res.headers.get('Content-Disposition'), 'attachment; filename="a.txt"')
})

Deno.test('Response#create file reads file and sets headers', async () => {
  const filePath = new URL('../fixtures/response-file.txt', import.meta.url).pathname
  const res = await send.file(filePath, 'custom.txt')
  assertEquals(res.headers.get('Content-Disposition'), 'attachment; filename="custom.txt"')
  assertEquals(res.headers.get('Content-Type'), 'application/octet-stream')
  assertEquals(await res.text(), 'fixture content\n')
})

Deno.test('Response#create file with missing path throws', async () => {
  let thrown = false
  try {
    await send.file('/nonexistent/path/file.txt')
  } catch (e) {
    thrown = true
    assertEquals((e as globalThis.Error).message.includes('Failed to read file'), true)
  }
  assertEquals(thrown, true)
})

Deno.test('Response#create html sets text/html', async () => {
  const res = send.html('<p>hi</p>', { status: 200 })
  assertEquals(res.headers.get('Content-Type'), 'text/html')
  assertEquals(await res.text(), '<p>hi</p>')
})

Deno.test('Response#create json serializes and sets application/json', async () => {
  const res = send.json({ a: 1 }, { status: 200 })
  assertEquals(res.headers.get('Content-Type'), 'application/json')
  assertEquals(await res.json(), { a: 1 })
})

Deno.test('Response#create redirect delegates to buildRedirect', () => {
  const res = send.redirect('https://example.com/', 301)
  assertEquals(res.status, 301)
  assertEquals(res.headers.get('Location'), 'https://example.com/')
})

Deno.test('Response#create stream sets Content-Type', () => {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('x'))
      controller.close()
    }
  })
  const res = send.stream(stream, undefined, 'text/plain')
  assertEquals(res.headers.get('Content-Type'), 'text/plain')
  assertEquals(res.headers.get('X-App'), 'test')
})

Deno.test('Response#create text sets text/plain', async () => {
  const res = send.text('hello', { status: 200 })
  assertEquals(res.headers.get('Content-Type'), 'text/plain')
  assertEquals(await res.text(), 'hello')
})
