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

Deno.test('Utils#escape passes through plain text unchanged', () => {
  assertEquals(Utils.escape('hello world'), 'hello world')
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

Deno.test('Utils#join with empty relative', () => {
  assertEquals(Utils.join('/views', ''), '/views/')
})

Deno.test('Utils#join with empty root', () => {
  assertEquals(Utils.join('', 'file.dve'), '/file.dve')
})

Deno.test('Utils#lookup does not resolve inherited __proto__', () => {
  assertEquals(Utils.lookup({}, '__proto__'), undefined)
})

Deno.test('Utils#lookup does not resolve inherited constructor', () => {
  assertEquals(Utils.lookup({}, 'constructor'), undefined)
})

Deno.test('Utils#lookup does not resolve inherited member mid-path', () => {
  assertEquals(Utils.lookup({ a: { x: 1 } }, 'a.constructor'), undefined)
})

Deno.test('Utils#lookup does not resolve inherited toString', () => {
  assertEquals(Utils.lookup({}, 'toString'), undefined)
})

Deno.test('Utils#lookup does not resolve string prototype __proto__', () => {
  assertEquals(Utils.lookup({ s: 'abc' }, 's.__proto__'), undefined)
})

Deno.test('Utils#lookup does not resolve string prototype constructor', () => {
  assertEquals(Utils.lookup({ s: 'abc' }, 's.constructor'), undefined)
})

Deno.test('Utils#lookup does not resolve string prototype method', () => {
  assertEquals(Utils.lookup({ s: 'abc' }, 's.toUpperCase'), undefined)
})

Deno.test('Utils#lookup handles empty segments in path', () => {
  assertEquals(Utils.lookup({ a: { b: 1 } }, 'a..b'), 1)
})

Deno.test('Utils#lookup reads a nested string length through a multi-segment path', () => {
  assertEquals(Utils.lookup({ obj: { s: 'hello' } }, 'obj.s.length'), 5)
})

Deno.test('Utils#lookup reads own char index of a string primitive', () => {
  assertEquals(Utils.lookup({ s: 'hi' }, 's.1'), 'i')
})

Deno.test('Utils#lookup reads own length of a string primitive', () => {
  assertEquals(Utils.lookup({ s: 'hello' }, 's.length'), 5)
})

Deno.test('Utils#lookup resolves an own key that shadows a builtin name', () => {
  assertEquals(Utils.lookup({ toString: 'mine' }, 'toString'), 'mine')
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

Deno.test('Utils#lookup returns undefined for an out-of-range string char index', () => {
  assertEquals(Utils.lookup({ s: 'hi' }, 's.5'), undefined)
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

Deno.test('Utils#lookup with array data and numeric string key', () => {
  assertEquals(Utils.lookup([10, 20, 30], '1'), 20)
})

Deno.test('Utils#lookup with mid-chain null', () => {
  assertEquals(Utils.lookup({ a: { b: null } }, 'a.b.c'), undefined)
})

Deno.test('Utils#lookup with path containing spaces around dots', () => {
  assertEquals(Utils.lookup({ a: { b: 1 } }, 'a . b'), 1)
})
