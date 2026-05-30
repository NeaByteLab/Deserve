import { assertEquals, assertThrows } from '@std/assert'
import { Tokenizer } from '@rendering/engine/Tokenizer.ts'
import { Expression } from '@rendering/engine/Expression.ts'

function parseExpr(expr: string) {
  const tokens = Tokenizer.tokenize(expr)
  const parser = new Expression(tokens)
  const node = parser.parse()
  parser.assertEnd()
  return node
}

Deno.test('Expression#assertEnd throws on unconsumed tokens', () => {
  const tokens = Tokenizer.tokenize('a b')
  const parser = new Expression(tokens)
  parser.parse()
  assertThrows(() => parser.assertEnd(), Error, 'Unexpected token')
})

Deno.test('Expression#parse binary addition', () => {
  const node = parseExpr('a + b')
  assertEquals(node.type, 'binary')
})

Deno.test('Expression#parse binary multiplication', () => {
  const node = parseExpr('a * b')
  assertEquals(node.type, 'binary')
})

Deno.test('Expression#parse chained member access', () => {
  const node = parseExpr('a.b.c.d')
  assertEquals(node.type, 'member')
})

Deno.test('Expression#parse empty tokens throws', () => {
  assertThrows(
    () => {
      const parser = new Expression([])
      parser.parse()
    },
    Error,
    'Unexpected end'
  )
})

Deno.test('Expression#parse equality', () => {
  const node = parseExpr('a === b')
  assertEquals(node.type, 'binary')
})

Deno.test('Expression#parse expected identifier after ?. throws', () => {
  assertThrows(() => parseExpr('a?. 5'), Error, 'Expected identifier after "?."')
})

Deno.test('Expression#parse expected identifier after dot throws', () => {
  assertThrows(() => parseExpr('a. 5'), Error, 'Expected identifier after "."')
})

Deno.test('Expression#parse identifier', () => {
  const node = parseExpr('foo')
  assertEquals(node.type, 'ident')
})

Deno.test('Expression#parse inequality operators', () => {
  for (const op of ['!==', '!=', '==']) {
    const node = parseExpr(`a ${op} b`)
    assertEquals(node.type, 'binary')
    assertEquals((node as { op: string }).op, op)
  }
})

Deno.test('Expression#parse invalid primary token throws', () => {
  assertThrows(() => parseExpr(')'), Error, 'Invalid primary')
})

Deno.test('Expression#parse left-associative addition', () => {
  const node = parseExpr('a + b + c')
  assertEquals(node.type, 'binary')
  assertEquals((node as { left: { type: string } }).left.type, 'binary')
})

Deno.test('Expression#parse logical AND and OR', () => {
  const node = parseExpr('a && b || c')
  assertEquals(node.type, 'binary')
})

Deno.test('Expression#parse member access', () => {
  const node = parseExpr('a.b.c')
  assertEquals(node.type, 'member')
})

Deno.test('Expression#parse missing closing paren throws', () => {
  assertThrows(() => parseExpr('(a + b'), Error, "Expected ')'")
})

Deno.test('Expression#parse modulo and division', () => {
  for (const op of ['/', '%']) {
    const node = parseExpr(`a ${op} b`)
    assertEquals(node.type, 'binary')
  }
})

Deno.test('Expression#parse nested ternary', () => {
  const node = parseExpr('a ? b ? 1 : 2 : 3')
  assertEquals(node.type, 'ternary')
})

Deno.test('Expression#parse nullish coalescing', () => {
  const node = parseExpr('a ?? b')
  assertEquals(node.type, 'binary')
})

Deno.test('Expression#parse number literal', () => {
  const node = parseExpr('42')
  assertEquals(node.type, 'literal')
})

Deno.test('Expression#parse optional chaining', () => {
  const node = parseExpr('a?.b')
  assertEquals(node.type, 'member')
})

Deno.test('Expression#parse parenthesized expression', () => {
  const node = parseExpr('(a + b) * c')
  assertEquals(node.type, 'binary')
})

Deno.test('Expression#parse relational operators', () => {
  for (const op of ['>', '<', '>=', '<=']) {
    const node = parseExpr(`a ${op} b`)
    assertEquals(node.type, 'binary')
  }
})

Deno.test('Expression#parse string literal', () => {
  const node = parseExpr('"hello"')
  assertEquals(node.type, 'literal')
})

Deno.test('Expression#parse subtraction operator', () => {
  const node = parseExpr('a - b')
  assertEquals(node.type, 'binary')
  assertEquals((node as { op: string }).op, '-')
})

Deno.test('Expression#parse ternary', () => {
  const node = parseExpr('a ? b : c')
  assertEquals(node.type, 'ternary')
})

Deno.test('Expression#parse ternary missing colon throws', () => {
  assertThrows(() => parseExpr('a ? b c'), Error, "Expected ':'")
})

Deno.test('Expression#parse unary minus', () => {
  const node = parseExpr('-5')
  assertEquals(node.type, 'unary')
})

Deno.test('Expression#parse unary not', () => {
  const node = parseExpr('!x')
  assertEquals(node.type, 'unary')
})

Deno.test('Expression#parse unary plus', () => {
  const node = parseExpr('+x')
  assertEquals(node.type, 'unary')
})
