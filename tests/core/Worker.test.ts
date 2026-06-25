import { assertEquals } from '@std/assert'
import * as Core from '@core/index.ts'

const echoWorkerUrl = import.meta.resolve('@tests/fixtures/echo_worker.ts')
const errorWorkerUrl = import.meta.resolve('@tests/fixtures/error_worker.ts')
const throwWorkerUrl = import.meta.resolve('@tests/fixtures/throw_worker.ts')

Deno.test('Worker createPool runs an echo task', async () => {
  const pool = Core.Worker.createPool({ scriptURL: echoWorkerUrl, poolSize: 1 })
  try {
    const result = await pool.run<{ value: number }>({ value: 42 })
    assertEquals(result.value, 42)
  } finally {
    pool.terminate()
  }
})

Deno.test('Worker createPool validates poolSize', () => {
  let threw = false
  try {
    Core.Worker.createPool({ scriptURL: echoWorkerUrl, poolSize: 0 })
  } catch (e) {
    threw = true
    assertEquals(e instanceof Deno.errors.InvalidData, true)
  }
  assertEquals(threw, true)
})

Deno.test('Worker run rejects after the pool is terminated', async () => {
  const pool = Core.Worker.createPool({ scriptURL: echoWorkerUrl, poolSize: 1 })
  pool.terminate()
  let threw = false
  try {
    await pool.run({})
  } catch (e) {
    threw = true
    assertEquals(e instanceof Deno.errors.BadResource, true)
  }
  assertEquals(threw, true)
})

Deno.test('Worker run rejects on an uncaught worker crash', async () => {
  const pool = Core.Worker.createPool({ scriptURL: throwWorkerUrl, poolSize: 1 })
  let threw = false
  try {
    await pool.run({})
  } catch (e) {
    threw = true
    assertEquals(e instanceof Deno.errors.BadResource, true)
  } finally {
    pool.terminate()
  }
  assertEquals(threw, true)
})

Deno.test('Worker run rejects when worker returns an error message', async () => {
  const pool = Core.Worker.createPool({ scriptURL: errorWorkerUrl, poolSize: 1 })
  let threw = false
  try {
    await pool.run({})
  } catch (e) {
    threw = true
    assertEquals(e instanceof Deno.errors.InvalidData, true)
  } finally {
    pool.terminate()
  }
  assertEquals(threw, true)
})

Deno.test('Worker run rejects with a timeout when task hangs', async () => {
  const hangUrl = import.meta.resolve('@tests/fixtures/hang_worker.ts')
  const pool = Core.Worker.createPool({
    scriptURL: hangUrl,
    poolSize: 1,
    taskTimeoutMs: 50
  })
  let threw = false
  try {
    await pool.run({ hang: true })
  } catch (e) {
    threw = true
    assertEquals(e instanceof Deno.errors.TimedOut, true)
  } finally {
    pool.terminate()
  }
  assertEquals(threw, true)
})
