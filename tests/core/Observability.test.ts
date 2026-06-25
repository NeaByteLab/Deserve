import { assertEquals } from '@std/assert'
import * as Core from '@core/index.ts'

Deno.test('Observability emit delivers events to listeners', () => {
  const obs = new Core.Observability()
  const kinds: string[] = []
  const unsub = obs.on((event) => kinds.push(event.kind))
  obs.emit(Core.Observability.internalEvent('server:stopped', {}))
  unsub()
  assertEquals(kinds.includes('server:stopped'), true)
})

Deno.test('Observability emit is skipped without listeners', () => {
  const obs = new Core.Observability()
  obs.emit(Core.Observability.internalEvent('server:stopped', {}))
  assertEquals(obs.hasListeners(), false)
})

Deno.test('Observability externalEvent stamps external type', () => {
  const event = Core.Observability.externalEvent('server:started', {
    port: 8000,
    hostname: '0.0.0.0'
  })
  assertEquals(event.type, 'external')
  assertEquals(event.kind, 'server:started')
})

Deno.test('Observability has no listeners initially', () => {
  const obs = new Core.Observability()
  assertEquals(obs.hasListeners(), false)
})

Deno.test('Observability internalEvent stamps internal type', () => {
  const event = Core.Observability.internalEvent('server:stopped', {})
  assertEquals(event.type, 'internal')
  assertEquals(event.kind, 'server:stopped')
  assertEquals(typeof event.timestamp, 'number')
})

Deno.test('Observability multiple listeners each receive events', () => {
  const obs = new Core.Observability()
  let a = 0
  let b = 0
  const unsubA = obs.on(() => a++)
  const unsubB = obs.on(() => b++)
  obs.emit(Core.Observability.internalEvent('server:stopped', {}))
  unsubA()
  unsubB()
  assertEquals(a, 1)
  assertEquals(b, 1)
})

Deno.test('Observability on registers a listener', () => {
  const obs = new Core.Observability()
  const unsub = obs.on(() => {})
  assertEquals(obs.hasListeners(), true)
  unsub()
  assertEquals(obs.hasListeners(), false)
})

Deno.test('Observability unsubscribe is idempotent', () => {
  const obs = new Core.Observability()
  const unsub = obs.on(() => {})
  unsub()
  unsub()
  assertEquals(obs.hasListeners(), false)
})
