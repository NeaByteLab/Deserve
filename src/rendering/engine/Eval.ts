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

  /**
   * Evaluate single AST node in scope.
   * @description Recursively evaluates literal, ident, member, ops.
   * @param exprNode - Expression AST node
   * @param scope - Scope data for identifiers
   * @returns Evaluated value
   */
  private static evalNode(exprNode: Types.ExprNode, scope: Record<string, unknown>): unknown {
    if (exprNode.type === 'literal') {
      return exprNode.value
    }
    if (exprNode.type === 'ident') {
      if (exprNode.name === 'true') {
        return true
      }
      if (exprNode.name === 'false') {
        return false
      }
      if (exprNode.name === 'null') {
        return null
      }
      if (exprNode.name === 'undefined') {
        return undefined
      }
      return scope[exprNode.name]
    }
    if (exprNode.type === 'member') {
      const objectValue = Eval.evalNode(exprNode.object, scope)
      if (objectValue === null || objectValue === undefined) {
        return undefined
      }
      if (typeof objectValue !== 'object') {
        return undefined
      }
      return (objectValue as Record<string, unknown>)[exprNode.property]
    }
    if (exprNode.type === 'unary') {
      const argValue = Eval.evalNode(exprNode.arg, scope)
      if (exprNode.op === '!') {
        return !argValue
      }
      if (exprNode.op === '+') {
        return typeof argValue === 'number' ? argValue : Number(argValue)
      }
      if (exprNode.op === '-') {
        return -(typeof argValue === 'number' ? argValue : Number(argValue))
      }
      return undefined
    }
    if (exprNode.type === 'binary') {
      if (exprNode.op === '&&') {
        const leftValue = Eval.evalNode(exprNode.left, scope)
        return leftValue ? Eval.evalNode(exprNode.right, scope) : leftValue
      }
      if (exprNode.op === '||') {
        const leftValue = Eval.evalNode(exprNode.left, scope)
        return leftValue ? leftValue : Eval.evalNode(exprNode.right, scope)
      }
      if (exprNode.op === '??') {
        const leftValue = Eval.evalNode(exprNode.left, scope)
        return leftValue === null || leftValue === undefined
          ? Eval.evalNode(exprNode.right, scope)
          : leftValue
      }
      const leftValue = Eval.evalNode(exprNode.left, scope)
      const rightValue = Eval.evalNode(exprNode.right, scope)
      switch (exprNode.op) {
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
    if (exprNode.type === 'ternary') {
      const testValue = Eval.evalNode(exprNode.test, scope)
      return testValue
        ? Eval.evalNode(exprNode.consequent, scope)
        : Eval.evalNode(exprNode.alternate, scope)
    }
    return undefined
  }
}
