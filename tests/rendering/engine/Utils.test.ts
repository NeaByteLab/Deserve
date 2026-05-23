import { assertEquals } from '@std/assert'
import { Utils } from '@rendering/engine/Utils.ts'

Deno.test('Utils#escape escapes ampersand', () => {
  assertEquals(Utils.escape('a & b'), 'a &amp; b')
})

Deno.test('Utils#escape escapes double quotes', () => {
  assertEquals(Utils.escape('"quoted"'), '&quot;quoted&quot;')
})

Deno.test('Utils#escape escapes less-than', () => {
  assertEquals(Utils.escape('<tag>'), '&lt;tag&gt;')
})

Deno.test('Utils#escape escapes single quotes', () => {
  assertEquals(Utils.escape("it's"), 'it&#39;s')
})

Deno.test('Utils#escape handles all special chars together', () => {
  assertEquals(Utils.escape('&<>"\' '), '&amp;&lt;&gt;&quot;&#39; ')
})

Deno.test('Utils#escape returns empty string for empty input', () => {
  assertEquals(Utils.escape(''), '')
})

Deno.test('Utils#join joins root and relative path', () => {
  assertEquals(Utils.join('/views', 'hello.dve'), '/views/hello.dve')
})

Deno.test('Utils#join normalizes backslashes in relative', () => {
  assertEquals(Utils.join('/views', 'sub\\hello.dve'), '/views/sub/hello.dve')
})

Deno.test('Utils#join strips leading slashes from relative', () => {
  assertEquals(Utils.join('/views', '/hello.dve'), '/views/hello.dve')
})

Deno.test('Utils#join strips trailing slashes from root', () => {
  assertEquals(Utils.join('/views///', 'hello.dve'), '/views/hello.dve')
})

Deno.test('Utils#lookup handles empty segments in path', () => {
  assertEquals(Utils.lookup({ a: { b: 1 } }, 'a..b'), 1)
})

Deno.test('Utils#lookup resolves dotted path', () => {
  assertEquals(Utils.lookup({ a: { b: { c: 42 } } }, 'a.b.c'), 42)
})

Deno.test('Utils#lookup resolves simple key', () => {
  assertEquals(Utils.lookup({ name: 'Alice' }, 'name'), 'Alice')
})

Deno.test('Utils#lookup returns root object for empty path', () => {
  const obj = { x: 1 }
  assertEquals(Utils.lookup(obj, ''), obj)
})

Deno.test('Utils#lookup returns undefined for missing path', () => {
  assertEquals(Utils.lookup({ a: 1 }, 'b'), undefined)
})

Deno.test('Utils#lookup returns undefined for null object', () => {
  assertEquals(Utils.lookup(null, 'a'), undefined)
})

Deno.test('Utils#lookup returns undefined for undefined object', () => {
  assertEquals(Utils.lookup(undefined, 'a'), undefined)
})

Deno.test('Utils#lookup returns undefined when traversing non-object', () => {
  assertEquals(Utils.lookup({ a: 42 }, 'a.b'), undefined)
})
