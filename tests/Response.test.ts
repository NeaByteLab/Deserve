import { assertEquals } from 'jsr:@std/assert'
import { ResponseHelpers } from '@app/index.ts'

const baseHeaders = { 'X-App': 'test' }
const buildRedirect = (url: string, status: number): Response =>
  new Response(null, { status, headers: new Headers({ Location: url }) })
const send = ResponseHelpers.create(baseHeaders, buildRedirect)

Deno.test('ResponseHelpers#create custom merges base headers and options', async () => {
  const res = send.custom('body', { status: 201, headers: { 'X-Custom': 'y' } })
  assertEquals(res.status, 201)
  assertEquals(res.headers.get('X-App'), 'test')
  assertEquals(res.headers.get('X-Custom'), 'y')
  assertEquals(await res.text(), 'body')
})

Deno.test('ResponseHelpers#create data sets Content-Disposition and Content-Type', () => {
  const res = send.data(new TextEncoder().encode('data'), 'file.bin', undefined, 'application/pdf')
  assertEquals(res.headers.get('Content-Type'), 'application/pdf')
  assertEquals(res.headers.get('Content-Disposition'), 'attachment; filename="file.bin"')
  assertEquals(res.headers.get('Content-Length'), '4')
  assertEquals(res.headers.get('X-App'), 'test')
})

Deno.test('ResponseHelpers#create file reads file and sets headers', async () => {
  const filePath = new URL('fixtures/response-file.txt', import.meta.url).pathname
  const res = await send.file(filePath, 'custom.txt')
  assertEquals(res.headers.get('Content-Disposition'), 'attachment; filename="custom.txt"')
  assertEquals(res.headers.get('Content-Type'), 'application/octet-stream')
  assertEquals(await res.text(), 'fixture content\n')
})

Deno.test('ResponseHelpers#create file with missing path throws', async () => {
  let thrown = false
  try {
    await send.file('/nonexistent/path/file.txt')
  } catch (e) {
    thrown = true
    assertEquals((e as Error).message.includes('Failed to read file'), true)
  }
  assertEquals(thrown, true)
})

Deno.test('ResponseHelpers#create html sets text/html', async () => {
  const res = send.html('<p>hi</p>', { status: 200 })
  assertEquals(res.headers.get('Content-Type'), 'text/html')
  assertEquals(await res.text(), '<p>hi</p>')
})

Deno.test('ResponseHelpers#create json serializes and sets application/json', async () => {
  const res = send.json({ a: 1 }, { status: 200 })
  assertEquals(res.headers.get('Content-Type'), 'application/json')
  assertEquals(await res.json(), { a: 1 })
})

Deno.test('ResponseHelpers#create redirect delegates to buildRedirect', () => {
  const res = send.redirect('https://example.com/', 301)
  assertEquals(res.status, 301)
  assertEquals(res.headers.get('Location'), 'https://example.com/')
})

Deno.test('ResponseHelpers#create stream sets Content-Type', () => {
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

Deno.test('ResponseHelpers#create text sets text/plain', async () => {
  const res = send.text('hello', { status: 200 })
  assertEquals(res.headers.get('Content-Type'), 'text/plain')
  assertEquals(await res.text(), 'hello')
})
