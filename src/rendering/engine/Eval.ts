import type * as Types from '@interfaces/index.ts'
import * as EngineParts from '@rendering/engine/index.ts'

/**
 * DVE expression evaluator
 * @description Evaluates expression AST against scope object
 */
export class Eval {
  /** Simple dotted path regex */
  private static readonly simplePathRegex =
    /^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)*$/
  /**
   * Evaluate expression in scope
   * @description Tokenizes, parses, and evaluates expression
   * @param expression - Expression source text
   * @param scope - Scope data for identifiers
   * @returns Evaluated expression value
   * @throws {Error} When expression parse fails
   */
  static evaluate(expression: string, scope: Record<string, unknown>): unknown {
    const trimmedExpression = expression.trim()
    if (!trimmedExpression) {
      return undefined
    }
    if (Eval.simplePathRegex.test(trimmedExpression)) {
      return EngineParts.Utils.lookup(scope, trimmedExpression)
    }
    const tokens = EngineParts.Tokenizer.tokenize(trimmedExpression)
    const parser = new EngineParts.Expression(tokens)
    const astNode = parser.parse()
    parser.assertEnd()
    return Eval.evalNode(astNode, scope)
  }
  private static evalNode(node: Types.ExprNode, scope: Record<string, unknown>): unknown {
    if (node.type === 'literal') {
      return node.value
    }
    if (node.type === 'ident') {
      if (node.name === 'true') {
        return true
      }
      if (node.name === 'false') {
        return false
      }
      if (node.name === 'null') {
        return null
      }
      if (node.name === 'undefined') {
        return undefined
      }
      return scope[node.name]
    }
    if (node.type === 'member') {
      const objectValue = Eval.evalNode(node.object, scope)
      if (objectValue === null || objectValue === undefined) {
        return undefined
      }
      if (typeof objectValue !== 'object') {
        return undefined
      }
      return (objectValue as Record<string, unknown>)[node.property]
    }
    if (node.type === 'unary') {
      const argValue = Eval.evalNode(node.arg, scope)
      if (node.op === '!') {
        return !argValue
      }
      if (node.op === '+') {
        return typeof argValue === 'number' ? argValue : Number(argValue)
      }
      if (node.op === '-') {
        return -(typeof argValue === 'number' ? argValue : Number(argValue))
      }
      return undefined
    }
    if (node.type === 'binary') {
      if (node.op === '&&') {
        const leftValue = Eval.evalNode(node.left, scope)
        return leftValue ? Eval.evalNode(node.right, scope) : leftValue
      }
      if (node.op === '||') {
        const leftValue = Eval.evalNode(node.left, scope)
        return leftValue ? leftValue : Eval.evalNode(node.right, scope)
      }
      if (node.op === '??') {
        const leftValue = Eval.evalNode(node.left, scope)
        return leftValue === null || leftValue === undefined
          ? Eval.evalNode(node.right, scope)
          : leftValue
      }
      const leftValue = Eval.evalNode(node.left, scope)
      const rightValue = Eval.evalNode(node.right, scope)
      switch (node.op) {
        case '===':
          return leftValue === rightValue
        case '!==':
          return leftValue !== rightValue
        case '==':
          return leftValue == rightValue
        case '!=':
          return leftValue != rightValue
        case '>':
          return (leftValue as never) > (rightValue as never)
        case '<':
          return (leftValue as never) < (rightValue as never)
        case '>=':
          return (leftValue as never) >= (rightValue as never)
        case '<=':
          return (leftValue as never) <= (rightValue as never)
        case '+':
          return (leftValue as never) + (rightValue as never)
        case '-':
          return (leftValue as never) - (rightValue as never)
        case '*':
          return (leftValue as never) * (rightValue as never)
        case '/':
          return (leftValue as never) / (rightValue as never)
        case '%':
          return (leftValue as never) % (rightValue as never)
        default:
          return undefined
      }
    }
    if (node.type === 'ternary') {
      const testValue = Eval.evalNode(node.test, scope)
      return testValue
        ? Eval.evalNode(node.consequent, scope)
        : Eval.evalNode(node.alternate, scope)
    }
    return undefined
  }
}
