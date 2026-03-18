import { assertEquals, assertThrows } from 'jsr:@std/assert'
import * as Core from '@core/index.ts'
import * as Middleware from '@middleware/index.ts'
import * as Routing from '@routing/index.ts'

function createTestContext(url = 'http://localhost/', requestInit?: RequestInit): Core.Context {
  const request = new Request(url, requestInit)
  return new Core.Context(request, new URL(url), {})
}

const echoWorkerUrl = new URL('../fixtures/echo_worker.ts', import.meta.url).href

Deno.test('BodyLimit with negative limit returns 413', async () => {
  const middleware = Middleware.Mware.bodyLimit({ limit: -1 })
  const ctx = createTestContext('http://localhost/', {
    method: 'POST',
    headers: new Headers({
      Accept: 'application/json',
      'Content-Length': '1'
    }),
    body: 'x'
  })
  const next = async (): Promise<Response> => new Response('should not')
  const res = await middleware(ctx, next)
  assertEquals(res !== undefined, true)
  if (res) {
    assertEquals(res.status, 413)
    assertEquals(await res.text(), '')
  }
})

Deno.test('Router constructor accepts poolSize 0 as 1', async () => {
  const router = new Routing.Router({
    routesDir: './routes',
    worker: { scriptURL: echoWorkerUrl, poolSize: 0 }
  })
  const handler = (router as unknown as { handler: unknown }).handler as {
    workerPool?: Core.Worker
  }
  assertEquals(handler.workerPool !== undefined, true)
  try {
    const result = await handler.workerPool!.run('ok')
    assertEquals(result, 'ok')
  } finally {
    handler.workerPool!.terminate()
  }
})

Deno.test('Router constructor throws on invalid worker config', () => {
  assertThrows(() => {
    new Routing.Router({
      routesDir: './routes',
      worker: { scriptURL: 'not-a-valid-worker-specifier', poolSize: 1 }
    })
  })
})

Deno.test('Worker#createPool throws on invalid scriptURL', () => {
  assertThrows(() => Core.Worker.createPool({ scriptURL: 'not-a-valid-worker-specifier' }))
})
