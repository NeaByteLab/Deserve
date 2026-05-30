import { assertEquals, assertThrows } from '@std/assert'
import { Parser } from '@rendering/engine/Parser.ts'

Deno.test('Parser#parse /each closing if block throws (mismatch)', () => {
  assertThrows(
    () => Parser.parse('{{#if ok}}{{/each}}'),
    Error,
    'Unexpected {{/each}} without matching {{#each}}'
  )
})

Deno.test('Parser#parse /each without each throws', () => {
  assertThrows(() => Parser.parse('{{/each}}'), Error, 'Unexpected {{/each}} without matching')
})

Deno.test('Parser#parse /if closing each block throws (mismatch)', () => {
  assertThrows(
    () => Parser.parse('{{#each items}}{{/if}}'),
    Error,
    'Unexpected {{/if}} without matching {{#if}}'
  )
})

Deno.test('Parser#parse /if without if throws', () => {
  assertThrows(() => Parser.parse('{{/if}}'), Error, 'Unexpected {{/if}} without matching')
})

Deno.test('Parser#parse consecutive tags without text between', () => {
  const nodes = Parser.parse('{{a}}{{b}}')
  assertEquals(nodes.length, 2)
  assertEquals(nodes[0]?.type, 'var')
  assertEquals((nodes[0] as { path: string }).path, 'a')
  assertEquals(nodes[1]?.type, 'var')
  assertEquals((nodes[1] as { path: string }).path, 'b')
})

Deno.test('Parser#parse each block', () => {
  const nodes = Parser.parse('{{#each items as item}}{{item}}{{/each}}')
  assertEquals(nodes.length, 1)
  assertEquals(nodes[0]?.type, 'each')
})

Deno.test('Parser#parse each with as clause using underscore identifier', () => {
  const nodes = Parser.parse('{{#each items as _item}}{{_item}}{{/each}}')
  assertEquals(nodes.length, 1)
  assertEquals(nodes[0]?.type, 'each')
  assertEquals((nodes[0] as { itemName: string }).itemName, '_item')
})

Deno.test('Parser#parse each without as clause defaults to item', () => {
  const nodes = Parser.parse('{{#each items}}{{item}}{{/each}}')
  assertEquals(nodes.length, 1)
  assertEquals((nodes[0] as { itemName: string }).itemName, 'item')
})

Deno.test('Parser#parse else inside each block throws', () => {
  assertThrows(
    () => Parser.parse('{{#each items}}{{else}}{{/each}}'),
    Error,
    'Unexpected {{else}} without matching {{#if}}'
  )
})

Deno.test('Parser#parse else without if throws', () => {
  assertThrows(() => Parser.parse('{{else}}'), Error, 'Unexpected {{else}} without matching')
})

Deno.test('Parser#parse empty raw tag is ignored', () => {
  const nodes = Parser.parse('a{{{}}}b')
  assertEquals(nodes.length, 2)
})

Deno.test('Parser#parse empty string returns empty array', () => {
  assertEquals(Parser.parse(''), [])
})

Deno.test('Parser#parse empty tag is ignored', () => {
  const nodes = Parser.parse('a{{}}b')
  assertEquals(nodes.length, 2)
  assertEquals(nodes[0]?.type, 'text')
  assertEquals(nodes[1]?.type, 'text')
})

Deno.test('Parser#parse if block', () => {
  const nodes = Parser.parse('{{#if ok}}yes{{/if}}')
  assertEquals(nodes.length, 1)
  assertEquals(nodes[0]?.type, 'if')
})

Deno.test('Parser#parse if/else block', () => {
  const nodes = Parser.parse('{{#if ok}}yes{{else}}no{{/if}}')
  assertEquals(nodes.length, 1)
  const ifNode = nodes[0] as { thenNodes: unknown[]; elseNodes: unknown[] }
  assertEquals(ifNode.thenNodes.length, 1)
  assertEquals(ifNode.elseNodes.length, 1)
})

Deno.test('Parser#parse include tag', () => {
  const nodes = Parser.parse('{{> partial.dve}}')
  assertEquals(nodes.length, 1)
  assertEquals(nodes[0]?.type, 'include')
})

Deno.test('Parser#parse include with empty path is ignored', () => {
  const nodes = Parser.parse('a{{> }}b')
  assertEquals(nodes.length, 2)
  assertEquals(nodes[0]?.type, 'text')
  assertEquals(nodes[1]?.type, 'text')
})

Deno.test('Parser#parse mixed text and tags', () => {
  const nodes = Parser.parse('Hello {{name}}!')
  assertEquals(nodes.length, 3)
  assertEquals(nodes[0]?.type, 'text')
  assertEquals(nodes[1]?.type, 'var')
  assertEquals(nodes[2]?.type, 'text')
})

Deno.test('Parser#parse multiple else in if block pushes to elseNodes', () => {
  const nodes = Parser.parse('{{#if ok}}A{{else}}B{{else}}C{{/if}}')
  assertEquals(nodes.length, 1)
  assertEquals(nodes[0]?.type, 'if')
  const ifNode = nodes[0] as { thenNodes: unknown[]; elseNodes: unknown[] }
  assertEquals(ifNode.thenNodes.length, 1)
  assertEquals(ifNode.elseNodes.length, 2)
})

Deno.test('Parser#parse nested each blocks', () => {
  const nodes = Parser.parse('{{#each outer as o}}{{#each inner as i}}{{i}}{{/each}}{{/each}}')
  assertEquals(nodes.length, 1)
  assertEquals(nodes[0]?.type, 'each')
})

Deno.test('Parser#parse nested if blocks', () => {
  const nodes = Parser.parse('{{#if a}}{{#if b}}inner{{/if}}{{/if}}')
  assertEquals(nodes.length, 1)
  assertEquals(nodes[0]?.type, 'if')
  const inner = (nodes[0] as { thenNodes: Array<{ type: string }> }).thenNodes
  assertEquals(inner.length, 1)
  assertEquals(inner[0]?.type, 'if')
})

Deno.test('Parser#parse plain text returns text node', () => {
  const nodes = Parser.parse('Hello World')
  assertEquals(nodes.length, 1)
  assertEquals(nodes[0]?.type, 'text')
})

Deno.test('Parser#parse raw variable tag', () => {
  const nodes = Parser.parse('{{{html}}}')
  assertEquals(nodes.length, 1)
  assertEquals(nodes[0]?.type, 'var')
  assertEquals((nodes[0] as { raw: boolean }).raw, true)
})

Deno.test('Parser#parse tags with extra whitespace', () => {
  const nodes = Parser.parse('{{  name  }}')
  assertEquals(nodes.length, 1)
  assertEquals(nodes[0]?.type, 'var')
  assertEquals((nodes[0] as { path: string }).path, 'name')
})

Deno.test('Parser#parse unclosed each block throws', () => {
  assertThrows(() => Parser.parse('{{#each items}}{{item}}'), Error, 'Unclosed {{#each}} block')
})

Deno.test('Parser#parse unclosed if block throws', () => {
  assertThrows(() => Parser.parse('{{#if ok}}yes'), Error, 'Unclosed {{#if}} block')
})

Deno.test('Parser#parse variable tag', () => {
  const nodes = Parser.parse('{{name}}')
  assertEquals(nodes.length, 1)
  assertEquals(nodes[0]?.type, 'var')
  assertEquals((nodes[0] as { raw: boolean }).raw, false)
})
