import { assertEquals } from '@std/assert'
import { fileURLToPath } from 'node:url'
import * as Core from '@core/index.ts'

const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(/[/\\]$/, '')

Deno.test('Rendering defaults directory to ./views', () => {
  const engine = new Core.Rendering({})
  assertEquals(engine.directory, './views')
})

Deno.test('Rendering exposes the configured directory', () => {
  const engine = new Core.Rendering({ directory: viewsDir })
  assertEquals(engine.directory, viewsDir)
})

Deno.test('Rendering invalidate emits an invalidated event', async () => {
  const events: string[] = []
  const engine = new Core.Rendering({ directory: viewsDir }, (event) => events.push(event.kind))
  await engine.render('hello', { name: 'A' }, {})
  engine.invalidate('hello')
  assertEquals(events.includes('view:invalidated'), true)
})

Deno.test('Rendering render caches compiled templates', async () => {
  const engine = new Core.Rendering({ directory: viewsDir })
  await engine.render('hello', { name: 'A' }, {})
  const res = await engine.render('hello', { name: 'B' }, {})
  assertEquals((await res.text()).includes('Hello B'), true)
})

Deno.test('Rendering render compiles and renders a template', async () => {
  const engine = new Core.Rendering({ directory: viewsDir })
  const res = await engine.render('hello', { name: 'World' }, {})
  assertEquals(res.status, 200)
  assertEquals(res.headers.get('content-type'), 'text/html; charset=utf-8')
  assertEquals((await res.text()).includes('Hello World'), true)
})

Deno.test('Rendering render evaluates expressions', async () => {
  const engine = new Core.Rendering({ directory: viewsDir })
  const res = await engine.render('expr', { user: { name: 'Ann', isAdmin: true } }, {})
  const html = await res.text()
  assertEquals(html.includes('Hello Ann'), true)
  assertEquals(html.includes('ADMIN'), true)
  assertEquals(html.includes('Sum=7'), true)
})

Deno.test('Rendering render honors a custom status', async () => {
  const engine = new Core.Rendering({ directory: viewsDir })
  const res = await engine.render('hello', { name: 'X' }, { status: 201 })
  assertEquals(res.status, 201)
})

Deno.test('Rendering render reuses cached include source across renders', async () => {
  const engine = new Core.Rendering({ directory: viewsDir })
  const first = await engine.render('include', { name: 'A' }, {})
  const second = await engine.render('include', { name: 'B' }, {})
  assertEquals((await first.text()).includes('Hello A'), true)
  assertEquals((await second.text()).includes('Hello B'), true)
})

Deno.test('Rendering render throws for a missing template', async () => {
  const engine = new Core.Rendering({ directory: viewsDir })
  let threw = false
  try {
    await engine.render('does-not-exist', {}, {})
  } catch {
    threw = true
  }
  assertEquals(threw, true)
})
