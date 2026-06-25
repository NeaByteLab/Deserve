import { assertEquals } from '@std/assert'
import type * as Types from '@interfaces/index.ts'
import * as Routing from '@routing/index.ts'

function emptyHolder(): Types.RequestHolder {
  return { ctx: null, frameworkError: null, parsedUrl: undefined, routePattern: undefined }
}

Deno.test('Report reportRequest carries method, status and url metadata', () => {
  const events: Types.EventBase[] = []
  const req = new Request('http://localhost/path', { method: 'POST' })
  const res = new Response('ok', { status: 201 })
  Routing.Report.reportRequest(
    (e) => events.push(e),
    req,
    res,
    performance.now(),
    emptyHolder(),
    false
  )
  const metadata = events[0]!.metadata as Record<string, unknown>
  assertEquals(metadata['method'], 'POST')
  assertEquals(metadata['statusCode'], 201)
  assertEquals(metadata['url'], 'http://localhost/path')
})

Deno.test('Report reportRequest collects user-agent metric', () => {
  const events: Types.EventBase[] = []
  const req = new Request('http://localhost/x', { headers: { 'user-agent': 'test-agent' } })
  const res = new Response('ok', { status: 200 })
  Routing.Report.reportRequest(
    (e) => events.push(e),
    req,
    res,
    performance.now(),
    emptyHolder(),
    false
  )
  const metadata = events[0]!.metadata as Record<string, unknown>
  assertEquals(metadata['userAgent'], 'test-agent')
})

Deno.test('Report reportRequest emits request:completed', () => {
  const kinds: string[] = []
  const req = new Request('http://localhost/ok')
  const res = new Response('ok', { status: 200 })
  Routing.Report.reportRequest(
    (e) => kinds.push(e.kind),
    req,
    res,
    performance.now(),
    emptyHolder(),
    false
  )
  assertEquals(kinds.includes('request:completed'), true)
  assertEquals(kinds.includes('request:failed'), false)
})

Deno.test('Report reportRequest emits request:failed for 4xx and 5xx', () => {
  const kinds: string[] = []
  const req = new Request('http://localhost/missing')
  const res = new Response('no', { status: 404 })
  Routing.Report.reportRequest(
    (e) => kinds.push(e.kind),
    req,
    res,
    performance.now(),
    emptyHolder(),
    false
  )
  assertEquals(kinds.includes('request:completed'), true)
  assertEquals(kinds.includes('request:failed'), true)
})

Deno.test('Report reportRequest uses internal channel when timed out', () => {
  const events: Types.EventBase[] = []
  const req = new Request('http://localhost/slow')
  const res = new Response(null, { status: 503 })
  Routing.Report.reportRequest(
    (e) => events.push(e),
    req,
    res,
    performance.now(),
    emptyHolder(),
    true
  )
  assertEquals(events[0]!.type, 'internal')
})
