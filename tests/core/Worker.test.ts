import { assertEquals, assertRejects, assertThrows } from '@std/assert'
import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'

const echoWorkerUrl = import.meta.resolve('@tests/fixtures/echo_worker.ts')
const errorWorkerUrl = import.meta.resolve('@tests/fixtures/error_worker.ts')
const throwWorkerUrl = import.meta.resolve('@tests/fixtures/throw_worker.ts')
const delayWorkerUrl = import.meta.resolve('@tests/fixtures/delay_worker.ts')
const hangWorkerUrl = import.meta.resolve('@tests/fixtures/hang_worker.ts')

Deno.test('Worker#createPool defaults poolSize when omitted', async () => {
  const pool = Core.Worker.createPool({ scriptURL: echoWorkerUrl })
  try {
    const result = await pool.run('ok')
    assertEquals(result, 'ok')
  } finally {
    pool.terminate()
  }
})

Deno.test('Worker#createPool floors a fractional poolSize and still runs', async () => {
  const pool = Core.Worker.createPool({ scriptURL: echoWorkerUrl, poolSize: 2.9 })
  try {
    const result = await pool.run('works')
    assertEquals(result, 'works')
  } finally {
    pool.terminate()
  }
})

Deno.test('Worker#createPool rejects a non-finite poolSize so the pool is never empty', () => {
  for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    assertThrows(
      () => Core.Worker.createPool({ scriptURL: echoWorkerUrl, poolSize: bad }),
      Deno.errors.InvalidData,
      'finite'
    )
  }
})

Deno.test('Worker#createPool rejects a non-positive maxQueueDepth', () => {
  for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assertThrows(
      () => Core.Worker.createPool({ scriptURL: echoWorkerUrl, maxQueueDepth: bad }),
      Deno.errors.InvalidData
    )
  }
})

Deno.test('Worker#createPool rejects a non-positive taskTimeoutMs', () => {
  assertThrows(
    () => Core.Worker.createPool({ scriptURL: echoWorkerUrl, taskTimeoutMs: 0 }),
    Deno.errors.InvalidData
  )
  assertThrows(
    () => Core.Worker.createPool({ scriptURL: echoWorkerUrl, taskTimeoutMs: -10 }),
    Deno.errors.InvalidData
  )
  assertThrows(
    () =>
      Core.Worker.createPool({ scriptURL: echoWorkerUrl, taskTimeoutMs: Number.POSITIVE_INFINITY }),
    Deno.errors.InvalidData
  )
  assertThrows(
    () =>
      Core.Worker.createPool({ scriptURL: echoWorkerUrl, taskTimeoutMs: Number.NEGATIVE_INFINITY }),
    Deno.errors.InvalidData
  )
  assertThrows(
    () => Core.Worker.createPool({ scriptURL: echoWorkerUrl, taskTimeoutMs: Number.NaN }),
    Deno.errors.InvalidData
  )
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

Deno.test('Worker#createPool with poolSize less than 1 uses 1', async () => {
  const pool = Core.Worker.createPool({ scriptURL: echoWorkerUrl, poolSize: -5 })
  try {
    const result = await pool.run('works')
    assertEquals(result, 'works')
  } finally {
    pool.terminate()
  }
})

Deno.test('Worker#run accepts new tasks again once the queue drains', async () => {
  const pool = Core.Worker.createPool({
    scriptURL: delayWorkerUrl,
    poolSize: 1,
    maxQueueDepth: 1,
    maxQueueWaitMs: 60_000
  })
  try {
    const first = pool.run({ id: 1, delay: 30 })
    await assertRejects(() => pool.run({ id: 2, delay: 30 }), Deno.errors.Busy)
    await first
    const afterDrain = await pool.run({ id: 3, delay: 0 })
    assertEquals(afterDrain, { id: 3, delay: 0 })
  } finally {
    pool.terminate()
  }
})

Deno.test('Worker#run after terminate rejects with no workers', async () => {
  const pool = Core.Worker.createPool({ scriptURL: echoWorkerUrl, poolSize: 1 })
  pool.terminate()
  await assertRejects(() => pool.run(1))
})

Deno.test('Worker#run completes a normal task within a valid taskTimeoutMs', async () => {
  const pool = Core.Worker.createPool({
    scriptURL: echoWorkerUrl,
    poolSize: 1,
    taskTimeoutMs: 5000
  })
  try {
    const result = await pool.run({ ping: 1 })
    assertEquals(result, { ping: 1 })
  } finally {
    pool.terminate()
  }
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

Deno.test('Worker#run emits no worker events for a task that completes normally', async () => {
  const events: Types.EventBase[] = []
  const pool = Core.Worker.createPool({
    scriptURL: echoWorkerUrl,
    poolSize: 1,
    emit: (event) => events.push(event)
  })
  try {
    assertEquals(await pool.run('ok'), 'ok')
    assertEquals(events, [])
  } finally {
    pool.terminate()
  }
})

Deno.test('Worker#run emits worker:crash then worker:respawn when a worker throws', async () => {
  const events: Types.EventBase[] = []
  const pool = Core.Worker.createPool({
    scriptURL: throwWorkerUrl,
    poolSize: 1,
    emit: (event) => events.push(event)
  })
  try {
    await assertRejects(() => pool.run('boom'))
    const kinds = events.map((event) => event.kind)
    assertEquals(kinds, ['worker:crash', 'worker:respawn'])
    const crash = events[0] as Types.EventByKind<'worker:crash'>
    assertEquals(crash.type, 'internal')
    assertEquals(crash.metadata.workerIndex, 0)
    assertEquals(crash.metadata.error.name, 'BadResource')
    const respawn = events[1] as Types.EventByKind<'worker:respawn'>
    assertEquals(respawn.metadata.workerIndex, 0)
  } finally {
    pool.terminate()
  }
})

Deno.test('Worker#run emits worker:rejected with queue-depth reason on a full queue', async () => {
  const events: Types.EventBase[] = []
  const pool = Core.Worker.createPool({
    scriptURL: delayWorkerUrl,
    poolSize: 1,
    maxQueueDepth: 1,
    maxQueueWaitMs: 60_000,
    emit: (event) => events.push(event)
  })
  try {
    const accepted = pool.run({ id: 1, delay: 50 })
    await assertRejects(() => pool.run({ id: 2, delay: 50 }), Deno.errors.Busy)
    await accepted
    const rejected = events.filter(
      (event): event is Types.EventByKind<'worker:rejected'> => event.kind === 'worker:rejected'
    )
    assertEquals(rejected.length, 1)
    assertEquals(rejected[0]!.metadata.reason, 'queue-depth')
    assertEquals(rejected[0]!.metadata.maxQueueDepth, 1)
    assertEquals(rejected[0]!.metadata.queueDepth, 1)
  } finally {
    pool.terminate()
  }
})

Deno.test('Worker#run emits worker:timeout then worker:respawn when a task hangs', async () => {
  const events: Types.EventBase[] = []
  const pool = Core.Worker.createPool({
    scriptURL: hangWorkerUrl,
    poolSize: 1,
    taskTimeoutMs: 1500,
    emit: (event) => events.push(event)
  })
  try {
    await assertRejects(() => pool.run({ hang: true }), Deno.errors.TimedOut)
    const kinds = events.map((event) => event.kind)
    assertEquals(kinds, ['worker:timeout', 'worker:respawn'])
    const timeout = events[0] as Types.EventByKind<'worker:timeout'>
    assertEquals(timeout.type, 'internal')
    assertEquals(timeout.metadata.timeoutMs, 1500)
    assertEquals(timeout.metadata.workerIndex, 0)
    assertEquals(timeout.metadata.error.name, 'TimedOut')
    const respawn = events[1] as Types.EventByKind<'worker:respawn'>
    assertEquals(respawn.metadata.workerIndex, 0)
  } finally {
    pool.terminate()
  }
})

Deno.test('Worker#run keeps the serialization tail bounded across many sequential tasks', async () => {
  const pool = Core.Worker.createPool({ scriptURL: echoWorkerUrl, poolSize: 1 })
  try {
    for (let i = 0; i < 200; i++) {
      assertEquals(await pool.run(i), i)
    }
    const tails = (pool as unknown as { workerTails: Promise<void>[] }).workerTails
    assertEquals(tails.length, 1)
    let settledValue: unknown = 'pending'
    await Promise.race([
      tails[0]!.then(() => {
        settledValue = 'settled'
      }),
      Promise.resolve().then(() => undefined)
    ])
    await tails[0]
    assertEquals(settledValue, 'settled')
  } finally {
    pool.terminate()
  }
})

Deno.test('Worker#run never sheds a healthy steady stream under the default bound', async () => {
  const pool = Core.Worker.createPool({ scriptURL: echoWorkerUrl, poolSize: 2 })
  try {
    for (let i = 0; i < 300; i++) {
      assertEquals(await pool.run(i), i)
    }
  } finally {
    pool.terminate()
  }
})

Deno.test('Worker#run omits worker events when no emitter is configured', async () => {
  const pool = Core.Worker.createPool({
    scriptURL: hangWorkerUrl,
    poolSize: 1,
    taskTimeoutMs: 1500
  })
  try {
    await assertRejects(() => pool.run({ hang: true }), Deno.errors.TimedOut)
    const recovered = await pool.run({ ok: 1 })
    assertEquals(recovered, { ok: 1 })
  } finally {
    pool.terminate()
  }
})

Deno.test('Worker#run pool self-heals after a worker crash', async () => {
  const pool = Core.Worker.createPool({ scriptURL: throwWorkerUrl, poolSize: 1 })
  try {
    await assertRejects(() => pool.run('first'))
    await assertRejects(() => pool.run('second'))
  } finally {
    pool.terminate()
  }
})

Deno.test('Worker#run preserves order over a long sequential run after the tail refactor', async () => {
  const pool = Core.Worker.createPool({
    scriptURL: delayWorkerUrl,
    poolSize: 1,
    maxQueueDepth: 100,
    maxQueueWaitMs: 60_000
  })
  try {
    const ids = Array.from({ length: 12 }, (_, index) => index)
    const results = (await Promise.all(
      ids.map((id) => pool.run({ id, delay: id % 2 === 0 ? 10 : 0 }))
    )) as { id: number }[]
    assertEquals(results.map((result) => result.id), ids)
  } finally {
    pool.terminate()
  }
})

Deno.test('Worker#run preserves submission order when earlier tasks are slower', async () => {
  const pool = Core.Worker.createPool({
    scriptURL: delayWorkerUrl,
    poolSize: 1,
    maxQueueDepth: 100,
    maxQueueWaitMs: 60_000
  })
  try {
    const results = (await Promise.all([
      pool.run({ id: 1, delay: 40 }),
      pool.run({ id: 2, delay: 20 }),
      pool.run({ id: 3, delay: 0 })
    ])) as { id: number }[]
    assertEquals(results.map((result) => result.id), [1, 2, 3])
  } finally {
    pool.terminate()
  }
})

Deno.test('Worker#run recovers the slot after a hung task times out', async () => {
  const pool = Core.Worker.createPool({
    scriptURL: hangWorkerUrl,
    poolSize: 1,
    taskTimeoutMs: 1500
  })
  try {
    await assertRejects(() => pool.run({ hang: true }), Deno.errors.TimedOut)
    const recovered = await pool.run({ ok: 1 })
    assertEquals(recovered, { ok: 1 })
  } finally {
    pool.terminate()
  }
})

Deno.test('Worker#run rejects a hung task once taskTimeoutMs elapses', async () => {
  const pool = Core.Worker.createPool({
    scriptURL: hangWorkerUrl,
    poolSize: 1,
    taskTimeoutMs: 1500
  })
  try {
    await assertRejects(() => pool.run({ hang: true }), Deno.errors.TimedOut)
  } finally {
    pool.terminate()
  }
})

Deno.test('Worker#run rejects a non-serializable payload with InvalidData', async () => {
  const pool = Core.Worker.createPool({ scriptURL: echoWorkerUrl, poolSize: 1 })
  try {
    await assertRejects(() => pool.run(() => 1), Deno.errors.InvalidData)
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

Deno.test('Worker#run serializes concurrent tasks so each gets its own result', async () => {
  const pool = Core.Worker.createPool({
    scriptURL: echoWorkerUrl,
    poolSize: 1,
    maxQueueDepth: 100,
    maxQueueWaitMs: 60_000
  })
  try {
    const inputs = ['a', 'b', 'c', 'd', 'e']
    const results = await Promise.all(inputs.map((value) => pool.run(value)))
    assertEquals(results, inputs)
  } finally {
    pool.terminate()
  }
})

Deno.test('Worker#run sheds load with Busy once the queue is full', async () => {
  const pool = Core.Worker.createPool({
    scriptURL: delayWorkerUrl,
    poolSize: 1,
    maxQueueDepth: 2,
    maxQueueWaitMs: 60_000
  })
  try {
    const accepted = [
      pool.run({ id: 1, delay: 50 }),
      pool.run({ id: 2, delay: 50 })
    ]
    await assertRejects(() => pool.run({ id: 3, delay: 50 }), Deno.errors.Busy)
    const settled = await Promise.all(accepted)
    assertEquals(settled, [{ id: 1, delay: 50 }, { id: 2, delay: 50 }])
  } finally {
    pool.terminate()
  }
})

Deno.test('Worker#run sheds load with a queue-wait reason when projected wait is too long', async () => {
  const events: Types.EventBase[] = []
  const pool = Core.Worker.createPool({
    scriptURL: delayWorkerUrl,
    poolSize: 1,
    taskTimeoutMs: 5_000,
    maxQueueDepth: 100,
    maxQueueWaitMs: 2_000,
    emit: (event) => events.push(event)
  })
  try {
    const accepted = pool.run({ id: 1, delay: 80 })
    await assertRejects(() => pool.run({ id: 2, delay: 0 }), Deno.errors.Busy)
    await accepted
    const rejected = events.filter(
      (event): event is Types.EventByKind<'worker:rejected'> => event.kind === 'worker:rejected'
    )
    assertEquals(rejected.length, 1)
    assertEquals(rejected[0]!.metadata.reason, 'queue-wait')
  } finally {
    pool.terminate()
  }
})

Deno.test('Worker#run survives many consecutive crashes without hanging', async () => {
  const pool = Core.Worker.createPool({ scriptURL: throwWorkerUrl, poolSize: 1 })
  try {
    for (let attempt = 0; attempt < 5; attempt++) {
      await assertRejects(() => pool.run(`crash-${attempt}`))
    }
  } finally {
    pool.terminate()
  }
})

Deno.test('Worker#run tags the failing slot index when the pool has many workers', async () => {
  const events: Types.EventBase[] = []
  const pool = Core.Worker.createPool({
    scriptURL: throwWorkerUrl,
    poolSize: 3,
    emit: (event) => events.push(event)
  })
  try {
    await assertRejects(() => pool.run('first'))
    await assertRejects(() => pool.run('second'))
    const crashes = events.filter(
      (event): event is Types.EventByKind<'worker:crash'> => event.kind === 'worker:crash'
    )
    assertEquals(crashes.map((event) => event.metadata.workerIndex), [0, 1])
  } finally {
    pool.terminate()
  }
})

Deno.test('Worker#run uncaught worker throw rejects without crashing the pool', async () => {
  const pool = Core.Worker.createPool({ scriptURL: throwWorkerUrl, poolSize: 1 })
  try {
    await assertRejects(() => pool.run('boom'))
  } finally {
    pool.terminate()
  }
})

Deno.test('Worker#terminate can be called multiple times safely', () => {
  const pool = Core.Worker.createPool({ scriptURL: echoWorkerUrl, poolSize: 1 })
  pool.terminate()
  pool.terminate()
})
