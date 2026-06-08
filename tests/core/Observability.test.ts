import type * as Types from '@interfaces/index.ts'
import { assertEquals } from '@std/assert'
import * as Core from '@core/index.ts'

Deno.test('Observability delivers sequential events in order to one subscriber', () => {
  const bus = new Core.Observability()
  const kinds: string[] = []
  bus.on((event) => kinds.push(event.kind))
  bus.emit({
    type: 'internal',
    kind: 'view:compiled',
    metadata: { path: '/a.dve', durationMs: 2 },
    timestamp: 1
  })
  bus.emit({
    type: 'internal',
    kind: 'view:rendered',
    metadata: { path: '/a.dve', durationMs: 3 },
    timestamp: 2
  })
  assertEquals(kinds, ['view:compiled', 'view:rendered'])
})

Deno.test('Observability delivers the full event payload to a subscriber', () => {
  const bus = new Core.Observability()
  let captured: Types.EventBase | null = null
  bus.on((event) => {
    captured = event
  })
  bus.emit({
    type: 'internal',
    kind: 'server:listening',
    metadata: { port: 8000, hostname: '0.0.0.0' },
    timestamp: 123
  })
  const event = captured as unknown as {
    type: string
    kind: string
    metadata: { port: number; hostname: string }
    timestamp: number
  }
  assertEquals(event.type, 'internal')
  assertEquals(event.kind, 'server:listening')
  assertEquals(event.metadata.port, 8000)
  assertEquals(event.metadata.hostname, '0.0.0.0')
  assertEquals(event.timestamp, 123)
})

Deno.test('Observability emit delivers events to subscriber', () => {
  const bus = new Core.Observability()
  const received: Types.EventBase[] = []
  bus.on((event) => received.push(event))
  bus.emit({
    type: 'internal',
    kind: 'server:listening',
    metadata: { port: 8000, hostname: '0.0.0.0' },
    timestamp: Date.now()
  })
  assertEquals(received.length, 1)
  assertEquals(received[0]?.kind, 'server:listening')
})

Deno.test('Observability emit does not throw when a listener throws', () => {
  const bus = new Core.Observability()
  bus.on(() => {
    throw new Error('listener boom')
  })
  let emitThrew = false
  try {
    bus.emit({
      type: 'internal',
      kind: 'route:loaded',
      metadata: { routePath: 'a.ts', pattern: '/a' },
      timestamp: Date.now()
    })
  } catch {
    emitThrew = true
  }
  assertEquals(emitThrew, false)
})

Deno.test('Observability emit is a no-op while no listener is registered', () => {
  const bus = new Core.Observability()
  let delivered = 0
  const unsub = bus.on(() => delivered++)
  unsub()
  bus.emit({
    type: 'internal',
    kind: 'route:loaded',
    metadata: { routePath: 'd.ts', pattern: '/d' },
    timestamp: Date.now()
  })
  assertEquals(delivered, 0)
  assertEquals(bus.hasListeners(), false)
})

Deno.test('Observability emit with no subscriber is a safe no-op', () => {
  const bus = new Core.Observability()
  bus.emit({
    type: 'internal',
    kind: 'route:removed',
    metadata: { routePath: 'x.ts', pattern: '/x' },
    timestamp: Date.now()
  })
})

Deno.test('Observability hasListeners reflects subscribe and unsubscribe', () => {
  const bus = new Core.Observability()
  assertEquals(bus.hasListeners(), false)
  const first = bus.on(() => {})
  assertEquals(bus.hasListeners(), true)
  const second = bus.on(() => {})
  assertEquals(bus.hasListeners(), true)
  first()
  assertEquals(bus.hasListeners(), true)
  second()
  assertEquals(bus.hasListeners(), false)
})

Deno.test('Observability hasListeners stays correct under repeated unsubscribe', () => {
  const bus = new Core.Observability()
  const unsub = bus.on(() => {})
  assertEquals(bus.hasListeners(), true)
  unsub()
  unsub()
  unsub()
  assertEquals(bus.hasListeners(), false)
  let delivered = 0
  bus.on(() => delivered++)
  bus.emit({
    type: 'internal',
    kind: 'route:loaded',
    metadata: { routePath: 'c.ts', pattern: '/c' },
    timestamp: Date.now()
  })
  assertEquals(delivered, 1)
})

Deno.test('Observability isolates a throwing listener from others', () => {
  const bus = new Core.Observability()
  let secondRan = false
  bus.on(() => {
    throw new Error('listener boom')
  })
  bus.on(() => {
    secondRan = true
  })
  bus.emit({
    type: 'internal',
    kind: 'view:refreshed',
    metadata: { paths: ['/v.dve'] },
    timestamp: Date.now()
  })
  assertEquals(secondRan, true)
})

Deno.test('Observability supports multiple subscribers', () => {
  const bus = new Core.Observability()
  let a = 0
  let b = 0
  bus.on(() => a++)
  bus.on(() => b++)
  bus.emit({
    type: 'internal',
    kind: 'request:error',
    metadata: {
      method: 'GET',
      statusCode: 404,
      url: 'http://localhost/x',
      durationMs: 1,
      error: new Error('nope')
    },
    timestamp: Date.now()
  })
  assertEquals(a, 1)
  assertEquals(b, 1)
})

Deno.test('Observability unsubscribe stops delivery', () => {
  const bus = new Core.Observability()
  let count = 0
  const unsub = bus.on(() => count++)
  bus.emit({
    type: 'internal',
    kind: 'route:loaded',
    metadata: { routePath: 'a.ts', pattern: '/a' },
    timestamp: Date.now()
  })
  unsub()
  bus.emit({
    type: 'internal',
    kind: 'route:loaded',
    metadata: { routePath: 'b.ts', pattern: '/b' },
    timestamp: Date.now()
  })
  assertEquals(count, 1)
})
