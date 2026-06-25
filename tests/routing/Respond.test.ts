import { assertEquals } from '@std/assert'
import * as Routing from '@routing/index.ts'

Deno.test('Respond isGenuine accepts a real Response', () => {
  assertEquals(Routing.Respond.isGenuine(new Response('x')), true)
})

Deno.test('Respond isGenuine rejects non-Response values', () => {
  assertEquals(Routing.Respond.isGenuine({}), false)
  assertEquals(Routing.Respond.isGenuine(null), false)
  assertEquals(Routing.Respond.isGenuine('x'), false)
})

Deno.test('Respond negotiatedError builds a JSON error when accepted', async () => {
  const req = new Request('http://localhost/', { headers: { accept: 'application/json' } })
  const res = Routing.Respond.negotiatedError(req, 400, 'Bad Request')
  assertEquals(res.status, 400)
  assertEquals(res.headers.get('content-type'), 'application/problem+json')
  await res.body?.cancel()
})

Deno.test('Respond negotiatedError builds an HTML error by default', async () => {
  const req = new Request('http://localhost/')
  const res = Routing.Respond.negotiatedError(req, 404, 'Not Found')
  assertEquals(res.status, 404)
  assertEquals(res.headers.get('content-type'), 'text/html; charset=utf-8')
  await res.body?.cancel()
})

Deno.test('Respond safeServerError uses the safe status message', async () => {
  const req = new Request('http://localhost/')
  const res = Routing.Respond.safeServerError(req, 500)
  assertEquals(res.status, 500)
  assertEquals((await res.text()).includes('Internal Server Error'), true)
})

Deno.test('Respond toHeadResponse drops the body and keeps status', async () => {
  const source = new Response('hello', { status: 200, headers: { 'x-a': '1' } })
  const head = await Routing.Respond.toHeadResponse(source)
  assertEquals(head.status, 200)
  assertEquals(head.body, null)
  assertEquals(head.headers.get('x-a'), '1')
})
