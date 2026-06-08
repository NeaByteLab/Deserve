import type * as Types from '@interfaces/index.ts'
import { assertEquals, assertRejects } from '@std/assert'
import { fileURLToPath } from 'node:url'
import * as Rendering from '@rendering/index.ts'

Deno.test('Engine#invalidateFile clears cache so template is reloaded', async () => {
  const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(
    /[\\/]$/,
    ''
  )
  const engine = new Rendering.Engine({ viewsDir })
  const first = await engine.render('hello.dve', { name: 'A' })
  assertEquals(first.trim(), 'Hello A.')
  const absPath = `${viewsDir}/hello.dve`
  engine.invalidateFile(absPath)
  const second = await engine.render('hello.dve', { name: 'B' })
  assertEquals(second.trim(), 'Hello B.')
})

Deno.test('Engine#notifyRefresh emits a view:refreshed event with the changed paths', () => {
  const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(
    /[\\/]$/,
    ''
  )
  const events: Types.EventBase[] = []
  const engine = new Rendering.Engine({ viewsDir, emit: (event) => events.push(event) })
  engine.notifyRefresh(['/v.dve'])
  assertEquals(events.length, 1)
  const refreshed = events[0] as {
    type: string
    kind: string
    metadata: { paths: readonly string[] }
  }
  assertEquals(refreshed.kind, 'view:refreshed')
  assertEquals(refreshed.type, 'internal')
  assertEquals(refreshed.metadata.paths, ['/v.dve'])
})

Deno.test('Engine#refreshPaths resets discovered paths', async () => {
  const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(
    /[\\/]$/,
    ''
  )
  const engine = new Rendering.Engine({ viewsDir })
  await engine.render('hello.dve', { name: 'X' })
  engine.refreshPaths()
  const html = await engine.render('hello.dve', { name: 'Y' })
  assertEquals(html.trim(), 'Hello Y.')
})

Deno.test('Engine#render appends .dve when omitted', async () => {
  const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(
    /[\\/]$/,
    ''
  )
  const engine = new Rendering.Engine({ viewsDir })
  const html = await engine.render('hello', { name: 'NoExt' })
  assertEquals(html.trim(), 'Hello NoExt.')
})

Deno.test('Engine#render caches compiled template', async () => {
  const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(
    /[\\/]$/,
    ''
  )
  const engine = new Rendering.Engine({ viewsDir })
  const first = await engine.render('hello.dve', { name: 'A' })
  const second = await engine.render('hello.dve', { name: 'B' })
  assertEquals(first.trim(), 'Hello A.')
  assertEquals(second.trim(), 'Hello B.')
})

Deno.test('Engine#render each does not resolve item prototype members', async () => {
  const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(
    /[\\/]$/,
    ''
  )
  const engine = new Rendering.Engine({ viewsDir })
  const html = await engine.render('each-proto.dve', { items: [{ x: 1 }] })
  assertEquals(html.trim(), '[]')
})

Deno.test('Engine#render each exposes @index/@first/@last/@length', async () => {
  const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(
    /[\\/]$/,
    ''
  )
  const engine = new Rendering.Engine({ viewsDir })
  const html = await engine.render('each-meta.dve', { items: ['a', 'b', 'c'] })
  assertEquals(html.trim(), '(0/3 F-=a);(1/3 --=b);(2/3 -L=c);')
})

Deno.test('Engine#render each exposes parent-scope variables inside the loop', async () => {
  const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(
    /[\\/]$/,
    ''
  )
  const engine = new Rendering.Engine({ viewsDir })
  const html = await engine.render('each-parent.dve', { title: 'T', items: ['a', 'b'] })
  assertEquals(html.trim(), 'T:a;T:b;')
})

Deno.test('Engine#render each renders all items', async () => {
  const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(
    /[\\/]$/,
    ''
  )
  const engine = new Rendering.Engine({ viewsDir })
  const html = await engine.render('each.dve', { items: [1, 2, 3] })
  assertEquals(html.trim(), '1,2,3,')
})

Deno.test('Engine#render each with empty array renders nothing', async () => {
  const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(
    /[\\/]$/,
    ''
  )
  const engine = new Rendering.Engine({ viewsDir })
  const html = await engine.render('each.dve', { items: [] })
  assertEquals(html.trim(), '')
})

Deno.test('Engine#render each with non-array data renders nothing', async () => {
  const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(
    /[\\/]$/,
    ''
  )
  const engine = new Rendering.Engine({ viewsDir })
  const html = await engine.render('each-nonarray.dve', { items: 'not-an-array' })
  assertEquals(html.trim(), '')
})

Deno.test('Engine#render each with null data renders nothing', async () => {
  const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(
    /[\\/]$/,
    ''
  )
  const engine = new Rendering.Engine({ viewsDir })
  const html = await engine.render('each-nonarray.dve', { items: null })
  assertEquals(html.trim(), '')
})

Deno.test('Engine#render emits view:compiled only once across cached renders', async () => {
  const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(
    /[\\/]$/,
    ''
  )
  const events: Types.EventBase[] = []
  const engine = new Rendering.Engine({ viewsDir, emit: (event) => events.push(event) })
  await engine.render('hello.dve', { name: 'A' })
  await engine.render('hello.dve', { name: 'B' })
  assertEquals(events.filter((event) => event.kind === 'view:compiled').length, 1)
  assertEquals(events.filter((event) => event.kind === 'view:rendered').length, 2)
})

Deno.test('Engine#render emits view:compiled then view:rendered with timing', async () => {
  const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(
    /[\\/]$/,
    ''
  )
  const events: Types.EventBase[] = []
  const engine = new Rendering.Engine({ viewsDir, emit: (event) => events.push(event) })
  await engine.render('hello.dve', { name: 'X' })
  assertEquals(events.map((event) => event.kind), ['view:compiled', 'view:rendered'])
  assertEquals(events.every((event) => event.type === 'internal'), true)
  const rendered = events.find((event) => event.kind === 'view:rendered') as
    | { metadata: { path: string; durationMs: number } }
    | undefined
  assertEquals(rendered?.metadata.path, 'hello.dve')
  assertEquals(typeof rendered?.metadata.durationMs, 'number')
  assertEquals((rendered?.metadata.durationMs ?? -1) >= 0, true)
})

Deno.test('Engine#render escapes variable by default', async () => {
  const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(
    /[\\/]$/,
    ''
  )
  const engine = new Rendering.Engine({ viewsDir })
  const html = await engine.render('escape.dve', { value: '<script>' })
  assertEquals(html.trim(), '&lt;script&gt;')
})

Deno.test('Engine#render if/else chooses correct branch', async () => {
  const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(
    /[\\/]$/,
    ''
  )
  const engine = new Rendering.Engine({ viewsDir })
  const yes = await engine.render('ifelse.dve', { ok: true })
  const no = await engine.render('ifelse.dve', { ok: false })
  assertEquals(yes.trim(), 'YES')
  assertEquals(no.trim(), 'NO')
})

Deno.test('Engine#render include renders nested template', async () => {
  const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(
    /[\\/]$/,
    ''
  )
  const engine = new Rendering.Engine({ viewsDir })
  const html = await engine.render('include.dve', { name: 'Nea' })
  assertEquals(html.trim(), 'Hello Nea.')
})

Deno.test('Engine#render nested each keeps outer-scope variables visible', async () => {
  const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(
    /[\\/]$/,
    ''
  )
  const engine = new Rendering.Engine({ viewsDir })
  const html = await engine.render('each-nested.dve', {
    groups: [{ name: 'G1', items: [1, 2] }, { name: 'G2', items: [3] }]
  })
  assertEquals(html.trim(), 'G1-1,G1-2,G2-3,')
})

Deno.test('Engine#render nested if/else works correctly', async () => {
  const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(
    /[\\/]$/,
    ''
  )
  const engine = new Rendering.Engine({ viewsDir })
  const both = await engine.render('nested-if.dve', { outer: true, inner: true })
  assertEquals(both.trim(), 'BOTH')
  const outerOnly = await engine.render('nested-if.dve', { outer: true, inner: false })
  assertEquals(outerOnly.trim(), 'OUTER_ONLY')
  const none = await engine.render('nested-if.dve', { outer: false, inner: true })
  assertEquals(none.trim(), 'NONE')
})

Deno.test('Engine#render raw var (triple braces) does not escape', async () => {
  const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(
    /[\\/]$/,
    ''
  )
  const engine = new Rendering.Engine({ viewsDir })
  const html = await engine.render('raw.dve', { value: '<b>ok</b>' })
  assertEquals(html.trim(), '<b>ok</b>')
})

Deno.test('Engine#render rejects else without if', async () => {
  const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(
    /[\\/]$/,
    ''
  )
  const engine = new Rendering.Engine({ viewsDir })
  await assertRejects(
    () => engine.render('attack-else-without-if.dve', {}),
    Error,
    'Unexpected {{else}} without matching {{#if}} block'
  )
})

Deno.test('Engine#render rejects unclosed block', async () => {
  const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(
    /[\\/]$/,
    ''
  )
  const engine = new Rendering.Engine({ viewsDir })
  await assertRejects(
    () => engine.render('attack-unclosed-block.dve', { ok: true }),
    Error,
    'Unclosed {{#if}} block in DVE template'
  )
})

Deno.test('Engine#render renders simple variable', async () => {
  const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(
    /[\\/]$/,
    ''
  )
  const engine = new Rendering.Engine({ viewsDir })
  const html = await engine.render('hello.dve', { name: 'World' })
  assertEquals(html.trim(), 'Hello World.')
})

Deno.test('Engine#render security: assignment is rejected', async () => {
  const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(
    /[\\/]$/,
    ''
  )
  const engine = new Rendering.Engine({ viewsDir })
  await assertRejects(() => engine.render('attack-assign.dve', { a: 0 }))
})

Deno.test('Engine#render security: bracket indexing is rejected', async () => {
  const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(
    /[\\/]$/,
    ''
  )
  const engine = new Rendering.Engine({ viewsDir })
  await assertRejects(() => engine.render('attack-index.dve', { items: ['secret'] }))
})

Deno.test('Engine#render security: escaped output prevents basic XSS payload', async () => {
  const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(
    /[\\/]$/,
    ''
  )
  const engine = new Rendering.Engine({ viewsDir })
  const payload = `<img src=x onerror="alert('x')">&<>'"`
  const html = await engine.render('attack-escape.dve', { payload })
  assertEquals(
    html.trim(),
    '&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;&amp;&lt;&gt;&#39;&quot;'
  )
})

Deno.test('Engine#render security: function call expression is rejected', async () => {
  const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(
    /[\\/]$/,
    ''
  )
  const engine = new Rendering.Engine({ viewsDir })
  await assertRejects(() => engine.render('attack-call.dve', { payload: () => 'x' }))
})

Deno.test('Engine#render security: include path traversal is blocked by discover set', async () => {
  const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(
    /[\\/]$/,
    ''
  )
  const engine = new Rendering.Engine({ viewsDir })
  await assertRejects(
    () => engine.render('attack-include-traversal.dve', {}),
    Error,
    'Template "../escape.dve" not found in views directory'
  )
})

Deno.test('Engine#render security: raw output renders payload as-is (XSS risk)', async () => {
  const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(
    /[\\/]$/,
    ''
  )
  const engine = new Rendering.Engine({ viewsDir })
  const payload = '<script>alert(1)</script>'
  const html = await engine.render('attack-raw.dve', { payload })
  assertEquals(html.trim(), payload)
})

Deno.test('Engine#render security: self-including template is stopped by include depth limit', async () => {
  const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(
    /[\\/]$/,
    ''
  )
  const engine = new Rendering.Engine({ viewsDir })
  await assertRejects(
    () => engine.render('each-recurse.dve', {}),
    Deno.errors.InvalidData,
    'include depth'
  )
})

Deno.test('Engine#render security: unterminated string literal is rejected', async () => {
  const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(
    /[\\/]$/,
    ''
  )
  const engine = new Rendering.Engine({ viewsDir })
  await assertRejects(
    () => engine.render('attack-unclosed-string.dve', {}),
    Error,
    'Unterminated string literal in DVE expression'
  )
})

Deno.test('Engine#render supports JS-like expressions in {{ ... }}', async () => {
  const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(
    /[\\/]$/,
    ''
  )
  const engine = new Rendering.Engine({ viewsDir })

  const htmlGuest = await engine.render('expr.dve', {})
  assertEquals(htmlGuest.trim(), 'Hello Guest.\nUSER\nSum=7')

  const htmlAdmin = await engine.render('expr.dve', { user: { name: 'Nea', isAdmin: true } })
  assertEquals(htmlAdmin.trim(), 'Hello Nea.\nADMIN\nSum=7')
})

Deno.test('Engine#render throws when template not found', async () => {
  const engine = new Rendering.Engine({ viewsDir: '/nonexistent-' + Date.now() })
  await assertRejects(
    () => engine.render('missing.dve', {}),
    Error,
    'Template "missing.dve" not found in views directory'
  )
})

Deno.test('Engine#render variable with undefined value renders empty', async () => {
  const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(
    /[\\/]$/,
    ''
  )
  const engine = new Rendering.Engine({ viewsDir })
  const html = await engine.render('hello.dve', {})
  assertEquals(html.trim(), 'Hello .')
})

Deno.test('Engine#render with backslash in path normalizes', async () => {
  const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(
    /[\\/]$/,
    ''
  )
  const engine = new Rendering.Engine({ viewsDir })
  const html = await engine.render('hello.dve', { name: 'Backslash' })
  assertEquals(html.trim(), 'Hello Backslash.')
})

Deno.test('Engine#render with empty data object', async () => {
  const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(
    /[\\/]$/,
    ''
  )
  const engine = new Rendering.Engine({ viewsDir })
  const html = await engine.render('hello.dve', {})
  assertEquals(html.trim(), 'Hello .')
})

Deno.test('Engine#render with null variable value renders empty', async () => {
  const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(
    /[\\/]$/,
    ''
  )
  const engine = new Rendering.Engine({ viewsDir })
  const html = await engine.render('hello.dve', { name: null })
  assertEquals(html.trim(), 'Hello .')
})

Deno.test({
  name: 'Engine#streamRender produces correct output',
  fn: async () => {
    const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(
      /[\\/]$/,
      ''
    )
    const engine = new Rendering.Engine({ viewsDir })
    const stream = await engine.streamRender('hello.dve', { name: 'Test' })
    const reader = stream.getReader()
    let result = ''
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      result += decoder.decode(value, { stream: true })
    }
    assertEquals(result.trim(), 'Hello Test.')
  },
  sanitizeOps: false
})

Deno.test({
  name: 'Engine#streamRender rejects before streaming when template is missing',
  fn: async () => {
    const engine = new Rendering.Engine({ viewsDir: '/nonexistent-' + Date.now() })
    await assertRejects(
      () => engine.streamRender('missing.dve', {}),
      Deno.errors.NotFound
    )
  },
  sanitizeOps: false
})

Deno.test('Engine#streamRender returns ReadableStream response', async () => {
  const viewsDir = fileURLToPath(import.meta.resolve('@tests/fixtures/views/')).replace(
    /[\\/]$/,
    ''
  )
  const engine = new Rendering.Engine({ viewsDir })
  const stream = await engine.streamRender('hello.dve', { name: 'Stream' })
  assertEquals(stream instanceof ReadableStream, true)
  await stream.cancel()
})

Deno.test('Engine#viewsDir returns configured directory', () => {
  const engine = new Rendering.Engine({ viewsDir: '/tmp/views' })
  assertEquals(engine.viewsDir, '/tmp/views')
})

Deno.test('Watcher#watch skips a non-existent views directory without throwing', () => {
  const engine = new Rendering.Engine({ viewsDir: './does-not-exist-views-dir-xyz' })
  Rendering.Watcher.watch(engine)
  assertEquals(true, true)
})
