import { assertEquals, assertRejects } from 'jsr:@std/assert'
import * as Rendering from '@rendering/index.ts'

Deno.test('Engine#render appends .dve when omitted', async () => {
  const viewsDir = new URL('../fixtures/views/', import.meta.url).pathname.replace(/\/$/, '')
  const engine = new Rendering.Engine({ viewsDir })
  const html = await engine.render('hello', { name: 'NoExt' })
  assertEquals(html.trim(), 'Hello NoExt.')
})

Deno.test('Engine#render each exposes @index/@first/@last/@length', async () => {
  const viewsDir = new URL('../fixtures/views/', import.meta.url).pathname.replace(/\/$/, '')
  const engine = new Rendering.Engine({ viewsDir })
  const html = await engine.render('each-meta.dve', { items: ['a', 'b', 'c'] })
  assertEquals(html.trim(), '(0/3 F-=a);(1/3 --=b);(2/3 -L=c);')
})

Deno.test('Engine#render each renders all items', async () => {
  const viewsDir = new URL('../fixtures/views/', import.meta.url).pathname.replace(/\/$/, '')
  const engine = new Rendering.Engine({ viewsDir })
  const html = await engine.render('each.dve', { items: [1, 2, 3] })
  assertEquals(html.trim(), '1,2,3,')
})

Deno.test('Engine#render escapes variable by default', async () => {
  const viewsDir = new URL('../fixtures/views/', import.meta.url).pathname.replace(/\/$/, '')
  const engine = new Rendering.Engine({ viewsDir })
  const html = await engine.render('escape.dve', { value: '<script>' })
  assertEquals(html.trim(), '&lt;script&gt;')
})

Deno.test('Engine#render if/else chooses correct branch', async () => {
  const viewsDir = new URL('../fixtures/views/', import.meta.url).pathname.replace(/\/$/, '')
  const engine = new Rendering.Engine({ viewsDir })
  const yes = await engine.render('ifelse.dve', { ok: true })
  const no = await engine.render('ifelse.dve', { ok: false })
  assertEquals(yes.trim(), 'YES')
  assertEquals(no.trim(), 'NO')
})

Deno.test('Engine#render include renders nested template', async () => {
  const viewsDir = new URL('../fixtures/views/', import.meta.url).pathname.replace(/\/$/, '')
  const engine = new Rendering.Engine({ viewsDir })
  const html = await engine.render('include.dve', { name: 'Nea' })
  assertEquals(html.trim(), 'Hello Nea.')
})

Deno.test('Engine#render raw var (triple braces) does not escape', async () => {
  const viewsDir = new URL('../fixtures/views/', import.meta.url).pathname.replace(/\/$/, '')
  const engine = new Rendering.Engine({ viewsDir })
  const html = await engine.render('raw.dve', { value: '<b>ok</b>' })
  assertEquals(html.trim(), '<b>ok</b>')
})

Deno.test('Engine#render renders simple variable', async () => {
  const viewsDir = new URL('../fixtures/views/', import.meta.url).pathname.replace(/\/$/, '')
  const engine = new Rendering.Engine({ viewsDir })
  const html = await engine.render('hello.dve', { name: 'World' })
  assertEquals(html.trim(), 'Hello World.')
})

Deno.test('Engine#render security: assignment is rejected', async () => {
  const viewsDir = new URL('../fixtures/views/', import.meta.url).pathname.replace(/\/$/, '')
  const engine = new Rendering.Engine({ viewsDir })
  await assertRejects(() => engine.render('attack-assign.dve', { a: 0 }))
})

Deno.test('Engine#render security: bracket indexing is rejected', async () => {
  const viewsDir = new URL('../fixtures/views/', import.meta.url).pathname.replace(/\/$/, '')
  const engine = new Rendering.Engine({ viewsDir })
  await assertRejects(() => engine.render('attack-index.dve', { items: ['secret'] }))
})

Deno.test('Engine#render security: escaped output prevents basic XSS payload', async () => {
  const viewsDir = new URL('../fixtures/views/', import.meta.url).pathname.replace(/\/$/, '')
  const engine = new Rendering.Engine({ viewsDir })
  const payload = `<img src=x onerror="alert('x')">&<>'"`
  const html = await engine.render('attack-escape.dve', { payload })
  assertEquals(
    html.trim(),
    '&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;&amp;&lt;&gt;&#39;&quot;'
  )
})

Deno.test('Engine#render security: function call expression is rejected', async () => {
  const viewsDir = new URL('../fixtures/views/', import.meta.url).pathname.replace(/\/$/, '')
  const engine = new Rendering.Engine({ viewsDir })
  await assertRejects(() => engine.render('attack-call.dve', { payload: () => 'x' }))
})

Deno.test('Engine#render security: include path traversal is blocked by discover set', async () => {
  const viewsDir = new URL('../fixtures/views/', import.meta.url).pathname.replace(/\/$/, '')
  const engine = new Rendering.Engine({ viewsDir })
  await assertRejects(
    () => engine.render('attack-include-traversal.dve', {}),
    Error,
    'Template not found: ../escape.dve'
  )
})

Deno.test('Engine#render security: raw output renders payload as-is (XSS risk)', async () => {
  const viewsDir = new URL('../fixtures/views/', import.meta.url).pathname.replace(/\/$/, '')
  const engine = new Rendering.Engine({ viewsDir })
  const payload = '<script>alert(1)</script>'
  const html = await engine.render('attack-raw.dve', { payload })
  assertEquals(html.trim(), payload)
})

Deno.test('Engine#render security: unterminated string literal is rejected', async () => {
  const viewsDir = new URL('../fixtures/views/', import.meta.url).pathname.replace(/\/$/, '')
  const engine = new Rendering.Engine({ viewsDir })
  await assertRejects(
    () => engine.render('attack-unclosed-string.dve', {}),
    Error,
    'Unterminated string literal in DVE expression'
  )
})

Deno.test('Engine#render supports JS-like expressions in {{ ... }}', async () => {
  const viewsDir = new URL('../fixtures/views/', import.meta.url).pathname.replace(/\/$/, '')
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
    'Template not found: missing.dve'
  )
})

Deno.test('Engine#render rejects else without if', async () => {
  const viewsDir = new URL('../fixtures/views/', import.meta.url).pathname.replace(/\/$/, '')
  const engine = new Rendering.Engine({ viewsDir })
  await assertRejects(
    () => engine.render('attack-else-without-if.dve', {}),
    Error,
    'Unexpected {{else}} without matching {{#if}} block.'
  )
})

Deno.test('Engine#render rejects unclosed block', async () => {
  const viewsDir = new URL('../fixtures/views/', import.meta.url).pathname.replace(/\/$/, '')
  const engine = new Rendering.Engine({ viewsDir })
  await assertRejects(
    () => engine.render('attack-unclosed-block.dve', { ok: true }),
    Error,
    'Unclosed {{#if}} block in DVE template.'
  )
})
