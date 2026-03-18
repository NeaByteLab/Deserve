import type * as Types from '@interfaces/index.ts'

/**
 * DVE expression parser
 * @description Builds expression AST from token list
 */
export class Expression {
  private idx = 0
  constructor(private readonly tokens: Types.ExprToken[]) {}
  /**
   * Assert no remaining tokens
   * @description Throws if unconsumed tokens remain
   * @throws {Error} When unexpected tokens remain
   */
  assertEnd(): void {
    if (this.idx < this.tokens.length) {
      throw new Error('Unexpected token in DVE expression.')
    }
  }
  /**
   * Parse tokens into expression AST
   * @description Parses ternary down to primary nodes
   * @returns Expression AST node
   */
  parse(): Types.ExprNode {
    return this.parseTry()
  }
  private consume(): Types.ExprToken | undefined {
    const t = this.tokens[this.idx]
    this.idx++
    return t
  }
  private peek(): Types.ExprToken | undefined {
    return this.tokens[this.idx]
  }
  private expectOp(value: string): void {
    const t = this.consume()
    if (!t || t.kind !== 'op' || t.value !== value) {
      throw new Error(`Expected '${value}' in DVE expression.`)
    }
  }
  private matchOp(value: string): boolean {
    const t = this.peek()
    if (t?.kind === 'op' && t.value === value) {
      this.idx++
      return true
    }
    return false
  }
  private parseAdd(): Types.ExprNode {
    let node = this.parseMul()
    while (true) {
      const t = this.peek()
      if (t?.kind === 'op' && (t.value === '+' || t.value === '-')) {
        this.consume()
        const right = this.parseMul()
        node = { type: 'binary', op: t.value, left: node, right }
        continue
      }
      return node
    }
  }
  private parseAnd(): Types.ExprNode {
    let node = this.parseEq()
    while (this.matchOp('&&')) {
      const right = this.parseEq()
      node = { type: 'binary', op: '&&', left: node, right }
    }
    return node
  }
  private parseEq(): Types.ExprNode {
    let node = this.parseRel()
    while (true) {
      const t = this.peek()
      if (
        t?.kind === 'op' &&
        (t.value === '===' || t.value === '!==' || t.value === '==' || t.value === '!=')
      ) {
        this.consume()
        const right = this.parseRel()
        node = { type: 'binary', op: t.value, left: node, right }
        continue
      }
      return node
    }
  }
  private parseMem(): Types.ExprNode {
    let node = this.parsePrim()
    while (true) {
      if (this.matchOp('.')) {
        const prop = this.consume()
        if (!prop || prop.kind !== 'ident') {
          throw new Error('Expected identifier after "." in DVE expression.')
        }
        node = { type: 'member', object: node, property: prop.value, optional: false }
        continue
      }
      if (this.matchOp('?.')) {
        const prop = this.consume()
        if (!prop || prop.kind !== 'ident') {
          throw new Error('Expected identifier after "?." in DVE expression.')
        }
        node = { type: 'member', object: node, property: prop.value, optional: true }
        continue
      }
      return node
    }
  }
  private parseMul(): Types.ExprNode {
    let node = this.parseUn()
    while (true) {
      const t = this.peek()
      if (t?.kind === 'op' && (t.value === '*' || t.value === '/' || t.value === '%')) {
        this.consume()
        const right = this.parseUn()
        node = { type: 'binary', op: t.value, left: node, right }
        continue
      }
      return node
    }
  }
  private parseNil(): Types.ExprNode {
    let node = this.parseOr()
    while (this.matchOp('??')) {
      const right = this.parseOr()
      node = { type: 'binary', op: '??', left: node, right }
    }
    return node
  }
  private parseOr(): Types.ExprNode {
    let node = this.parseAnd()
    while (this.matchOp('||')) {
      const right = this.parseAnd()
      node = { type: 'binary', op: '||', left: node, right }
    }
    return node
  }
  private parsePrim(): Types.ExprNode {
    const t = this.consume()
    if (!t) {
      throw new Error('Unexpected end of DVE expression.')
    }
    if (t.kind === 'number') {
      return { type: 'literal', value: t.value }
    }
    if (t.kind === 'string') {
      return { type: 'literal', value: t.value }
    }
    if (t.kind === 'ident') {
      return { type: 'ident', name: t.value }
    }
    if (t.kind === 'op' && t.value === '(') {
      const inner = this.parse()
      this.expectOp(')')
      return inner
    }
    throw new Error('Invalid primary in DVE expression.')
  }
  private parseRel(): Types.ExprNode {
    let node = this.parseAdd()
    while (true) {
      const t = this.peek()
      if (
        t?.kind === 'op' &&
        (t.value === '>' || t.value === '<' || t.value === '>=' || t.value === '<=')
      ) {
        this.consume()
        const right = this.parseAdd()
        node = { type: 'binary', op: t.value, left: node, right }
        continue
      }
      return node
    }
  }
  private parseTry(): Types.ExprNode {
    let node = this.parseNil()
    if (this.matchOp('?')) {
      const consequent = this.parse()
      this.expectOp(':')
      const alternate = this.parse()
      node = { type: 'ternary', test: node, consequent, alternate }
    }
    return node
  }
  private parseUn(): Types.ExprNode {
    const t = this.peek()
    if (t?.kind === 'op' && (t.value === '!' || t.value === '+' || t.value === '-')) {
      this.consume()
      const arg = this.parseUn()
      return { type: 'unary', op: t.value as '!' | '+' | '-', arg }
    }
    return this.parseMem()
  }
}
