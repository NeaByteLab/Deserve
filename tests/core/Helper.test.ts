import { assertEquals } from '@std/assert'
import * as Core from '@core/index.ts'

Deno.test('Helper#toRecord with Headers containing duplicate keys', () => {
  const headers = new Headers()
  headers.append('X-Multi', 'a')
  headers.append('X-Multi', 'b')
  const record = Core.Helper.toRecord(headers)
  assertEquals(record['x-multi'], 'a, b')
})

Deno.test('Helper#toRecord with Headers instance returns record', () => {
  const headers = new Headers({ 'X-A': '1', 'X-B': '2' })
  const record = Core.Helper.toRecord(headers)
  assertEquals(record['x-a'], '1')
  assertEquals(record['x-b'], '2')
})

Deno.test('Helper#toRecord with array of pairs returns record', () => {
  const pairs: [string, string][] = [['X-A', '1'], ['X-B', '2']]
  const record = Core.Helper.toRecord(pairs)
  assertEquals(record['X-A'], '1')
  assertEquals(record['X-B'], '2')
})

Deno.test('Helper#toRecord with empty Headers returns empty record', () => {
  const record = Core.Helper.toRecord(new Headers())
  assertEquals(Object.keys(record).length, 0)
})

Deno.test('Helper#toRecord with empty array returns empty record', () => {
  const record = Core.Helper.toRecord([])
  assertEquals(Object.keys(record).length, 0)
})

Deno.test('Helper#toRecord with empty object returns empty record', () => {
  const record = Core.Helper.toRecord({})
  assertEquals(Object.keys(record).length, 0)
})

Deno.test('Helper#toRecord with plain object returns copy', () => {
  const obj = { 'X-A': '1', 'X-B': '2' }
  const record = Core.Helper.toRecord(obj)
  assertEquals(record['X-A'], '1')
  assertEquals(record['X-B'], '2')
  obj['X-A'] = 'changed'
  assertEquals(record['X-A'], '1')
})

Deno.test('Helper#toRecord with single-entry array', () => {
  const pairs: [string, string][] = [['Key', 'Val']]
  const record = Core.Helper.toRecord(pairs)
  assertEquals(record['Key'], 'Val')
  assertEquals(Object.keys(record).length, 1)
})

Deno.test('Helper#toRecord with undefined returns empty record', () => {
  const record = Core.Helper.toRecord(undefined)
  assertEquals(Object.keys(record).length, 0)
})
