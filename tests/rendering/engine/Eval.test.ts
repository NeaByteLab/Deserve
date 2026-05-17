import { assertEquals } from 'jsr:@std/assert'
import { Eval } from '@rendering/engine/Eval.ts'

Deno.test('Eval#evaluate arithmetic addition', () => {
  assertEquals(Eval.evaluate('a + b', { a: 3, b: 4 }), 7)
})

Deno.test('Eval#evaluate arithmetic division', () => {
  assertEquals(Eval.evaluate('a / b', { a: 10, b: 2 }), 5)
})

Deno.test('Eval#evaluate arithmetic modulo', () => {
  assertEquals(Eval.evaluate('a % b', { a: 10, b: 3 }), 1)
})

Deno.test('Eval#evaluate arithmetic multiplication', () => {
  assertEquals(Eval.evaluate('a * b', { a: 3, b: 4 }), 12)
})

Deno.test('Eval#evaluate arithmetic subtraction', () => {
  assertEquals(Eval.evaluate('a - b', { a: 10, b: 3 }), 7)
})

Deno.test('Eval#evaluate complex nested expression', () => {
  assertEquals(
    Eval.evaluate('a > 0 ? a * 2 : -a', { a: 5 }),
    10
  )
  assertEquals(
    Eval.evaluate('a > 0 ? a * 2 : -a', { a: -3 }),
    3
  )
})

Deno.test('Eval#evaluate deep dotted path', () => {
  assertEquals(Eval.evaluate('a.b.c', { a: { b: { c: 42 } } }), 42)
})

Deno.test('Eval#evaluate division by zero returns Infinity', () => {
  assertEquals(Eval.evaluate('a / b', { a: 1, b: 0 }), Infinity)
})

Deno.test('Eval#evaluate dotted path fast path', () => {
  assertEquals(Eval.evaluate('user.name', { user: { name: 'Bob' } }), 'Bob')
})

Deno.test('Eval#evaluate dotted path on missing key returns undefined', () => {
  assertEquals(Eval.evaluate('a.b.c', { a: {} }), undefined)
})

Deno.test('Eval#evaluate dotted path on null returns undefined', () => {
  assertEquals(Eval.evaluate('a.b', { a: null }), undefined)
})

Deno.test('Eval#evaluate empty expression returns undefined', () => {
  assertEquals(Eval.evaluate('', {}), undefined)
})

Deno.test('Eval#evaluate literal false via expression', () => {
  assertEquals(Eval.evaluate('!true', {}), false)
})

Deno.test('Eval#evaluate literal true via expression', () => {
  assertEquals(Eval.evaluate('!false', {}), true)
})

Deno.test('Eval#evaluate logical AND short-circuits', () => {
  assertEquals(Eval.evaluate('a && b', { a: false, b: 42 }), false)
  assertEquals(Eval.evaluate('a && b', { a: true, b: 42 }), 42)
})

Deno.test('Eval#evaluate logical OR short-circuits', () => {
  assertEquals(Eval.evaluate('a || b', { a: 'yes', b: 'no' }), 'yes')
  assertEquals(Eval.evaluate('a || b', { a: '', b: 'fallback' }), 'fallback')
})

Deno.test('Eval#evaluate loose equality', () => {
  assertEquals(Eval.evaluate('a == b', { a: 1, b: '1' }), true)
})

Deno.test('Eval#evaluate loose inequality', () => {
  assertEquals(Eval.evaluate('a != b', { a: 1, b: 2 }), true)
})

Deno.test('Eval#evaluate member access on non-object returns undefined', () => {
  assertEquals(Eval.evaluate('a.b', { a: 42 }), undefined)
})

Deno.test('Eval#evaluate member access on null returns undefined', () => {
  assertEquals(Eval.evaluate('a.b', { a: null }), undefined)
})

Deno.test('Eval#evaluate nullish coalescing', () => {
  assertEquals(Eval.evaluate('a ?? b', { a: null, b: 'default' }), 'default')
  assertEquals(Eval.evaluate('a ?? b', { a: undefined, b: 'default' }), 'default')
  assertEquals(Eval.evaluate('a ?? b', { a: 0, b: 'default' }), 0)
  assertEquals(Eval.evaluate('a ?? b', { a: '', b: 'default' }), '')
})

Deno.test('Eval#evaluate number literal', () => {
  assertEquals(Eval.evaluate('42', {}), 42)
})

Deno.test('Eval#evaluate relational operators', () => {
  assertEquals(Eval.evaluate('a > b', { a: 5, b: 3 }), true)
  assertEquals(Eval.evaluate('a < b', { a: 3, b: 5 }), true)
  assertEquals(Eval.evaluate('a >= b', { a: 5, b: 5 }), true)
  assertEquals(Eval.evaluate('a <= b', { a: 3, b: 5 }), true)
})

Deno.test('Eval#evaluate simple identifier from scope', () => {
  assertEquals(Eval.evaluate('name', { name: 'Alice' }), 'Alice')
})

Deno.test('Eval#evaluate strict equality', () => {
  assertEquals(Eval.evaluate('a === b', { a: 1, b: 1 }), true)
  assertEquals(Eval.evaluate('a === b', { a: 1, b: '1' }), false)
})

Deno.test('Eval#evaluate strict inequality', () => {
  assertEquals(Eval.evaluate('a !== b', { a: 1, b: 2 }), true)
  assertEquals(Eval.evaluate('a !== b', { a: 1, b: 1 }), false)
})

Deno.test('Eval#evaluate string concatenation', () => {
  assertEquals(Eval.evaluate('a + b', { a: 'hello ', b: 'world' }), 'hello world')
})

Deno.test('Eval#evaluate string literal', () => {
  assertEquals(Eval.evaluate('"hello"', {}), 'hello')
})

Deno.test('Eval#evaluate ternary operator', () => {
  assertEquals(Eval.evaluate('a ? "yes" : "no"', { a: true }), 'yes')
  assertEquals(Eval.evaluate('a ? "yes" : "no"', { a: false }), 'no')
})

Deno.test('Eval#evaluate true/false/null in complex expression', () => {
  assertEquals(Eval.evaluate('1 === 1', {}), true)
  assertEquals(Eval.evaluate('1 === 2', {}), false)
  assertEquals(Eval.evaluate('a ?? "fallback"', {}), 'fallback')
})

Deno.test('Eval#evaluate true/false/null/undefined are simple paths', () => {
  assertEquals(Eval.evaluate('true', {}), undefined)
  assertEquals(Eval.evaluate('false', {}), undefined)
  assertEquals(Eval.evaluate('null', {}), undefined)
  assertEquals(Eval.evaluate('undefined', {}), undefined)
})

Deno.test('Eval#evaluate unary minus negates', () => {
  assertEquals(Eval.evaluate('-a', { a: 5 }), -5)
  assertEquals(Eval.evaluate('-a', { a: '3' }), -3)
})

Deno.test('Eval#evaluate unary not', () => {
  assertEquals(Eval.evaluate('!a', { a: true }), false)
  assertEquals(Eval.evaluate('!a', { a: false }), true)
  assertEquals(Eval.evaluate('!a', { a: 0 }), true)
})

Deno.test('Eval#evaluate unary plus converts to number', () => {
  assertEquals(Eval.evaluate('+a', { a: '5' }), 5)
  assertEquals(Eval.evaluate('+a', { a: 3 }), 3)
})

Deno.test('Eval#evaluate whitespace-only returns undefined', () => {
  assertEquals(Eval.evaluate('   ', {}), undefined)
})
