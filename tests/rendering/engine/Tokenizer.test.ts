import { assertEquals, assertThrows } from 'jsr:@std/assert'
import { Tokenizer } from '@rendering/engine/Tokenizer.ts'

Deno.test('Tokenizer#tokenize complex expression', () => {
  const tokens = Tokenizer.tokenize('a > 1 ? "yes" : "no"')
  assertEquals(tokens.length, 7)
  assertEquals(tokens[0]?.kind, 'ident')
  assertEquals(tokens[1]?.value, '>')
  assertEquals(tokens[2]?.kind, 'number')
  assertEquals(tokens[3]?.value, '?')
  assertEquals(tokens[4]?.kind, 'string')
  assertEquals(tokens[5]?.value, ':')
  assertEquals(tokens[6]?.kind, 'string')
})

Deno.test('Tokenizer#tokenize double-quoted string', () => {
  const tokens = Tokenizer.tokenize('"world"')
  assertEquals(tokens.length, 1)
  assertEquals(tokens[0]?.kind, 'string')
  assertEquals(tokens[0]?.value, 'world')
})

Deno.test('Tokenizer#tokenize empty string returns empty array', () => {
  assertEquals(Tokenizer.tokenize(''), [])
})

Deno.test('Tokenizer#tokenize float number', () => {
  const tokens = Tokenizer.tokenize('3.14')
  assertEquals(tokens.length, 1)
  assertEquals(tokens[0]?.kind, 'number')
  assertEquals(tokens[0]?.value, 3.14)
})

Deno.test('Tokenizer#tokenize identifier', () => {
  const tokens = Tokenizer.tokenize('foo')
  assertEquals(tokens.length, 1)
  assertEquals(tokens[0]?.kind, 'ident')
  assertEquals(tokens[0]?.value, 'foo')
})

Deno.test('Tokenizer#tokenize identifier starting with $ or _ or @', () => {
  for (const name of ['$var', '_private', '@index']) {
    const tokens = Tokenizer.tokenize(name)
    assertEquals(tokens[0]?.kind, 'ident')
    assertEquals(tokens[0]?.value, name)
  }
})

Deno.test('Tokenizer#tokenize integer number', () => {
  const tokens = Tokenizer.tokenize('42')
  assertEquals(tokens.length, 1)
  assertEquals(tokens[0]?.kind, 'number')
  assertEquals(tokens[0]?.value, 42)
})

Deno.test('Tokenizer#tokenize invalid character throws', () => {
  assertThrows(() => Tokenizer.tokenize('a # b'), Error, 'Invalid DVE expression token')
})

Deno.test('Tokenizer#tokenize number followed by dot with no digits', () => {
  const tokens = Tokenizer.tokenize('5.')
  assertEquals(tokens[0]?.kind, 'number')
  assertEquals(tokens[0]?.value, 5)
})

Deno.test('Tokenizer#tokenize single-char operators', () => {
  for (const op of ['(', ')', '?', ':', '.', '!', '+', '-', '*', '/', '%', '>', '<']) {
    const tokens = Tokenizer.tokenize(op)
    assertEquals(tokens[0]?.kind, 'op')
    assertEquals(tokens[0]?.value, op)
  }
})

Deno.test('Tokenizer#tokenize single-quoted string', () => {
  const tokens = Tokenizer.tokenize("'hello'")
  assertEquals(tokens.length, 1)
  assertEquals(tokens[0]?.kind, 'string')
  assertEquals(tokens[0]?.value, 'hello')
})

Deno.test('Tokenizer#tokenize string with escape sequences', () => {
  const tokens = Tokenizer.tokenize("'line1\\nline2\\ttab\\rret'")
  assertEquals(tokens[0]?.value, 'line1\nline2\ttab\rret')
})

Deno.test('Tokenizer#tokenize string with escaped quote', () => {
  const tokens = Tokenizer.tokenize("'it\\'s'")
  assertEquals(tokens[0]?.value, "it's")
})

Deno.test('Tokenizer#tokenize three-char operators === and !==', () => {
  const tokens = Tokenizer.tokenize('a === b !== c')
  assertEquals(tokens[1]?.value, '===')
  assertEquals(tokens[3]?.value, '!==')
})

Deno.test('Tokenizer#tokenize two-char operators', () => {
  for (const op of ['&&', '||', '??', '>=', '<=', '==', '!=', '?.']) {
    const tokens = Tokenizer.tokenize(`a ${op} b`)
    assertEquals(tokens[1]?.value, op)
  }
})

Deno.test('Tokenizer#tokenize unterminated string throws', () => {
  assertThrows(() => Tokenizer.tokenize("'no end"), Error, 'Unterminated string literal')
})

Deno.test('Tokenizer#tokenize whitespace only returns empty array', () => {
  assertEquals(Tokenizer.tokenize('   \t\n  '), [])
})
