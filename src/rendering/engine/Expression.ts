import type * as Types from '@interfaces/index.ts'

/**
 * DVE expression parser.
 * @description Builds expression AST from token list.
 */
export class Expression {
  /** Current token stream index */
  private tokenIndex = 0

  /**
   * Create parser for token list.
   * @description Holds token array for parsing.
   * @param tokens - Expression tokens from tokenizer
   */
  constructor(private readonly tokens: Types.ExprToken[]) {}

  /** Assert no remaining tokens */
  assertEnd(): void {
    if (this.tokenIndex < this.tokens.length) {
      throw new Deno.errors.InvalidData('Unexpected token in DVE expression')
    }
  }

  /** Parse tokens into expression AST */
  parse(): Types.ExprNode {
    return this.parseTry()
  }

  /** Advance and return current token */
  private consume(): Types.ExprToken | undefined {
    const currentToken = this.tokens[this.tokenIndex]
    this.tokenIndex++
    return currentToken
  }

  /**
   * Consume token and require operator.
   * @description Throws if current token is not given op.
   * @param expectedOp - Expected operator string
   * @throws {Deno.errors.InvalidData} When token is not the operator
   */
  private expectOp(expectedOp: Types.TokenOp): void {
    const currentToken = this.consume()
    if (!currentToken || currentToken.kind !== 'op' || currentToken.value !== expectedOp) {
      throw new Deno.errors.InvalidData(`Expected '${expectedOp}' in DVE expression`)
    }
  }

  /**
   * Match and consume operator if present.
   * @description Advances only when current op equals value.
   * @param expectedOp - Operator to match
   * @returns True when matched and consumed
   */
  private matchOp(expectedOp: Types.TokenOp): boolean {
    const currentToken = this.peek()
    if (currentToken?.kind === 'op' && currentToken.value === expectedOp) {
      this.tokenIndex++
      return true
    }
    return false
  }

  /** Parse additive expression */
  private parseAdd(): Types.ExprNode {
    let exprNode = this.parseMul()
    while (true) {
      const currentToken = this.peek()
      if (
        currentToken?.kind === 'op' &&
        (currentToken.value === '+' || currentToken.value === '-')
      ) {
        this.consume()
        const rightNode = this.parseMul()
        exprNode = { type: 'binary', op: currentToken.value, left: exprNode, right: rightNode }
        continue
      }
      return exprNode
    }
  }

  /** Parse logical AND expression */
  private parseAnd(): Types.ExprNode {
    let exprNode = this.parseEq()
    while (this.matchOp('&&')) {
      const rightNode = this.parseEq()
      exprNode = { type: 'binary', op: '&&', left: exprNode, right: rightNode }
    }
    return exprNode
  }

  /** Parse equality expression */
  private parseEq(): Types.ExprNode {
    let exprNode = this.parseRel()
    while (true) {
      const currentToken = this.peek()
      if (
        currentToken?.kind === 'op' &&
        (currentToken.value === '===' ||
          currentToken.value === '!==' ||
          currentToken.value === '==' ||
          currentToken.value === '!=')
      ) {
        this.consume()
        const rightNode = this.parseRel()
        exprNode = { type: 'binary', op: currentToken.value, left: exprNode, right: rightNode }
        continue
      }
      return exprNode
    }
  }

  /** Parse member access expression */
  private parseMem(): Types.ExprNode {
    let exprNode = this.parsePrim()
    while (true) {
      if (this.matchOp('.')) {
        const propToken = this.consume()
        if (!propToken || propToken.kind !== 'ident') {
          throw new Deno.errors.InvalidData('Expected identifier after "." in DVE expression')
        }
        exprNode = { type: 'member', object: exprNode, property: propToken.value }
        continue
      }
      if (this.matchOp('?.')) {
        const propToken = this.consume()
        if (!propToken || propToken.kind !== 'ident') {
          throw new Deno.errors.InvalidData('Expected identifier after "?." in DVE expression')
        }
        exprNode = { type: 'member', object: exprNode, property: propToken.value }
        continue
      }
      return exprNode
    }
  }

  /** Parse multiplicative expression */
  private parseMul(): Types.ExprNode {
    let exprNode = this.parseUn()
    while (true) {
      const currentToken = this.peek()
      if (
        currentToken?.kind === 'op' &&
        (currentToken.value === '*' || currentToken.value === '/' || currentToken.value === '%')
      ) {
        this.consume()
        const rightNode = this.parseUn()
        exprNode = { type: 'binary', op: currentToken.value, left: exprNode, right: rightNode }
        continue
      }
      return exprNode
    }
  }

  /** Parse nullish coalescing expression */
  private parseNil(): Types.ExprNode {
    let exprNode = this.parseOr()
    while (this.matchOp('??')) {
      const rightNode = this.parseOr()
      exprNode = { type: 'binary', op: '??', left: exprNode, right: rightNode }
    }
    return exprNode
  }

  /** Parse logical OR expression */
  private parseOr(): Types.ExprNode {
    let exprNode = this.parseAnd()
    while (this.matchOp('||')) {
      const rightNode = this.parseAnd()
      exprNode = { type: 'binary', op: '||', left: exprNode, right: rightNode }
    }
    return exprNode
  }

  /** Parse primary expression */
  private parsePrim(): Types.ExprNode {
    const currentToken = this.consume()
    if (!currentToken) {
      throw new Deno.errors.InvalidData('Unexpected end of DVE expression')
    }
    if (currentToken.kind === 'number') {
      return { type: 'literal', value: currentToken.value }
    }
    if (currentToken.kind === 'string') {
      return { type: 'literal', value: currentToken.value }
    }
    if (currentToken.kind === 'ident') {
      return { type: 'ident', name: currentToken.value }
    }
    if (currentToken.kind === 'op' && currentToken.value === '(') {
      const innerNode = this.parse()
      this.expectOp(')')
      return innerNode
    }
    throw new Deno.errors.InvalidData('Invalid primary in DVE expression')
  }

  /** Parse relational expression */
  private parseRel(): Types.ExprNode {
    let exprNode = this.parseAdd()
    while (true) {
      const currentToken = this.peek()
      if (
        currentToken?.kind === 'op' &&
        (currentToken.value === '>' ||
          currentToken.value === '<' ||
          currentToken.value === '>=' ||
          currentToken.value === '<=')
      ) {
        this.consume()
        const rightNode = this.parseAdd()
        exprNode = { type: 'binary', op: currentToken.value, left: exprNode, right: rightNode }
        continue
      }
      return exprNode
    }
  }

  /** Parse ternary and nullish */
  private parseTry(): Types.ExprNode {
    let exprNode = this.parseNil()
    if (this.matchOp('?')) {
      const consequent = this.parse()
      this.expectOp(':')
      const alternate = this.parse()
      exprNode = { type: 'ternary', test: exprNode, consequent, alternate }
    }
    return exprNode
  }

  /** Parse unary or member expression */
  private parseUn(): Types.ExprNode {
    const currentToken = this.peek()
    if (
      currentToken?.kind === 'op' &&
      (currentToken.value === '!' || currentToken.value === '+' || currentToken.value === '-')
    ) {
      this.consume()
      const argNode = this.parseUn()
      return { type: 'unary', op: currentToken.value as Types.UnaryOp, arg: argNode }
    }
    return this.parseMem()
  }

  /** Read current token without advancing */
  private peek(): Types.ExprToken | undefined {
    return this.tokens[this.tokenIndex]
  }
}
