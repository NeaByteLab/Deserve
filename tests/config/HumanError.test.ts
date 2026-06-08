import { assertEquals, assertThrows } from '@std/assert'
import * as Core from '@core/index.ts'
import * as Middleware from '@middleware/index.ts'
import * as Routing from '@routing/index.ts'

const echoWorkerUrl = import.meta.resolve('@tests/fixtures/echo_worker.ts')

Deno.test('BodyLimit with limit 0 is rejected at creation', () => {
  assertThrows(
    () => Middleware.Mware.bodyLimit({ limit: 0 }),
    Deno.errors.InvalidData,
    'positive finite'
  )
})

Deno.test('BodyLimit with negative limit is rejected at creation', () => {
  assertThrows(
    () => Middleware.Mware.bodyLimit({ limit: -1 }),
    Deno.errors.InvalidData,
    'positive finite'
  )
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

Deno.test('Worker#createPool with poolSize 0 creates working pool', async () => {
  const pool = Core.Worker.createPool({ scriptURL: echoWorkerUrl, poolSize: 0 })
  try {
    const result = await pool.run('hello')
    assertEquals(result, 'hello')
  } finally {
    pool.terminate()
  }
})

Deno.test('Worker#createPool with poolSize 0 uses 1', () => {
  assertThrows(() => Core.Worker.createPool({ scriptURL: 'not-a-valid-worker-specifier' }))
})
