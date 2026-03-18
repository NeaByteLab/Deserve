import { assertEquals, assertRejects } from 'jsr:@std/assert'
import * as Core from '@core/index.ts'

const echoWorkerUrl = new URL('../fixtures/echo_worker.ts', import.meta.url).href
const errorWorkerUrl = new URL('../fixtures/error_worker.ts', import.meta.url).href

Deno.test('Worker#createPool defaults poolSize when omitted', async () => {
  const pool = Core.Worker.createPool({ scriptURL: echoWorkerUrl })
  try {
    const result = await pool.run('ok')
    assertEquals(result, 'ok')
  } finally {
    pool.terminate()
  }
})

Deno.test('Worker#createPool with poolSize 1 creates pool', () => {
  const pool = Core.Worker.createPool({ scriptURL: echoWorkerUrl, poolSize: 1 })
  assertEquals(pool instanceof Core.Worker, true)
  pool.terminate()
})

Deno.test('Worker#createPool with poolSize 2 round-robins', async () => {
  const pool = Core.Worker.createPool({ scriptURL: echoWorkerUrl, poolSize: 2 })
  try {
    assertEquals(await pool.run('a'), 'a')
    assertEquals(await pool.run('b'), 'b')
    assertEquals(await pool.run('c'), 'c')
  } finally {
    pool.terminate()
  }
})

Deno.test('Worker#run after terminate rejects with no workers', async () => {
  const pool = Core.Worker.createPool({ scriptURL: echoWorkerUrl, poolSize: 1 })
  pool.terminate()
  await assertRejects(() => pool.run(1))
})

Deno.test('Worker#run echoes payload when worker posts back', async () => {
  const pool = Core.Worker.createPool({ scriptURL: echoWorkerUrl, poolSize: 1 })
  try {
    const result = await pool.run({ foo: 'bar' })
    assertEquals(result, { foo: 'bar' })
    const num = await pool.run(42)
    assertEquals(num, 42)
  } finally {
    pool.terminate()
  }
})

Deno.test('Worker#run rejects when worker posts error shape', async () => {
  const pool = Core.Worker.createPool({ scriptURL: errorWorkerUrl, poolSize: 1 })
  try {
    await assertRejects(() => pool.run(null))
  } finally {
    pool.terminate()
  }
})
