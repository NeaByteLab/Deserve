import { assertEquals } from '@std/assert'
import * as Core from '@core/index.ts'
import type * as Types from '@interfaces/index.ts'

Deno.test('Guard blocks a self-kill but lets other-PID kills pass through', () => {
  const received: Types.EventBase[] = []
  const unregister = Core.Guard.register((event) => {
    if (event.kind === 'process:error') {
      received.push(event)
    }
  })
  try {
    const denoKill = Deno.kill as unknown as (pid: number, signal?: string) => void
    denoKill(Deno.pid, 'SIGTERM')
    const meta = received.at(-1)!.metadata as { origin: string; error: Error }
    assertEquals(meta.origin, 'process:exit')
    assertEquals(meta.error.message.includes('Deno.kill('), true)
    const before = received.length
    let passedThrough = false
    try {
      denoKill(2147483646, 'SIGTERM')
    } catch {
      passedThrough = true
    }
    assertEquals(passedThrough, true)
    assertEquals(received.length, before)
  } finally {
    unregister()
  }
})

Deno.test('Guard neutralizes Deno.exit, keeps running, and emits process:error', () => {
  const received: Types.EventBase[] = []
  const unregister = Core.Guard.register((event) => {
    if (event.kind === 'process:error') {
      received.push(event)
    }
  })
  try {
    const denoExit = Deno.exit as unknown as (code?: number) => void
    denoExit(42)
    assertEquals(received.length >= 1, true)
    const meta = received.at(-1)!.metadata as { origin: string; error: Error }
    assertEquals(meta.origin, 'process:exit')
    assertEquals(meta.error instanceof Error, true)
    assertEquals(meta.error.message.includes('Deno.exit(42)'), true)
  } finally {
    unregister()
  }
})

Deno.test('Guard neutralizes node process.exit, keeps running, and emits process:error', () => {
  const proc = (globalThis as { process?: { exit?: (code?: number) => void } }).process
  if (!proc || typeof proc.exit !== 'function') {
    return
  }
  const received: Types.EventBase[] = []
  const unregister = Core.Guard.register((event) => {
    if (event.kind === 'process:error') {
      received.push(event)
    }
  })
  try {
    proc.exit(7)
    assertEquals(received.length >= 1, true)
    const meta = received.at(-1)!.metadata as { origin: string; error: Error }
    assertEquals(meta.origin, 'process:exit')
    assertEquals(meta.error.message.includes('process.exit(7)'), true)
  } finally {
    unregister()
  }
})

Deno.test('Guard neutralizes process.abort and process.reallyExit, keeps running', () => {
  const proc = (
    globalThis as {
      process?: { abort?: () => void; reallyExit?: (code?: number) => void }
    }
  ).process
  if (!proc || typeof proc.abort !== 'function' || typeof proc.reallyExit !== 'function') {
    return
  }
  const received: Types.EventBase[] = []
  const unregister = Core.Guard.register((event) => {
    if (event.kind === 'process:error') {
      received.push(event)
    }
  })
  try {
    proc.abort()
    proc.reallyExit(3)
    const messages = received.map((event) => (event.metadata as { error: Error }).error.message)
    assertEquals(
      messages.some((message) => message.includes('process.abort(')),
      true
    )
    assertEquals(
      messages.some((message) => message.includes('process.reallyExit(3)')),
      true
    )
  } finally {
    unregister()
  }
})

Deno.test(
  'Guard traps an unhandled rejection, keeps running, and emits process:error',
  async () => {
    const received: Types.EventBase[] = []
    const unregister = Core.Guard.register((event) => {
      if (event.kind === 'process:error') {
        received.push(event)
      }
    })
    try {
      void (async () => {
        throw new Error('guard regression floating rejection')
      })()
      await new Promise((resolve) => setTimeout(resolve, 50))
      assertEquals(received.length >= 1, true)
      const meta = received[0]!.metadata as { origin: string; error: Error }
      assertEquals(meta.origin, 'unhandledrejection')
      assertEquals(meta.error instanceof Error, true)
    } finally {
      unregister()
    }
  }
)

Deno.test('Guard#register install is idempotent across many registrations', () => {
  const unsubscribers: Array<() => void> = []
  try {
    for (let i = 0; i < 10; i++) {
      unsubscribers.push(Core.Guard.register(() => {}))
    }
    assertEquals(unsubscribers.length, 10)
  } finally {
    for (const off of unsubscribers) {
      off()
    }
  }
})

Deno.test('Guard#register unregister removes the emitter from the fan-out', async () => {
  const received: Types.EventBase[] = []
  const unregister = Core.Guard.register((event) => {
    if (event.kind === 'process:error') {
      received.push(event)
    }
  })
  unregister()
  void (async () => {
    throw new Error('after-unregister rejection')
  })()
  await new Promise((resolve) => setTimeout(resolve, 50))
  assertEquals(received.length, 0)
})
