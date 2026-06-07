import type * as Types from '@interfaces/index.ts'
import * as Core from '@core/index.ts'
import * as EngineParts from '@rendering/engine/index.ts'

/**
 * DVE expression evaluator.
 * @description Evaluates expression AST against scope object.
 */
export class Eval {
  /**
   * Evaluate expression in scope.
   * @description Tokenizes, parses, and evaluates expression.
   * @param expression - Expression source text
   * @param scope - Scope data for identifiers
   * @returns Evaluated expression value
   * @throws {Deno.errors.InvalidData} When expression parse fails
   */
  static evaluate(expression: string, scope: Types.DataRecord): unknown {
    const trimmedExpression = expression.trim()
    if (!trimmedExpression) {
      return undefined
    }
    if (Core.Constant.simplePathRegex.test(trimmedExpression)) {
      return EngineParts.Utils.lookup(scope, trimmedExpression)
    }
    const exprTokens = EngineParts.Tokenizer.tokenize(trimmedExpression)
    const exprParser = new EngineParts.Expression(exprTokens)
    const astNode = exprParser.parse()
    exprParser.assertEnd()
    return Eval.evalNode(astNode, scope)
  }

  /**
   * Evaluate binary expression node.
   * @description Short-circuits logical ops, else applies the operator.
   * @param exprNode - Binary AST node
   * @param scope - Scope data for identifiers
   * @returns Evaluated value
   * @throws {Deno.errors.InvalidData} When the operator is not whitelisted
   */
  private static evalBinary(
    exprNode: Extract<Types.ExprNode, { type: 'binary' }>,
    scope: Types.DataRecord
  ): unknown {
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
        throw new Deno.errors.InvalidData(
          `Unsupported DVE binary operator "${(exprNode as Types.ExprOpCarrier).op}"`
        )
    }
  }

  /**
   * Resolve identifier to keyword or scope.
   * @description Keywords return literals; names read own scope properties.
   * @param identName - Identifier name
   * @param scope - Scope data for identifiers
   * @returns Resolved value
   */
  private static evalIdent(identName: string, scope: Types.DataRecord): unknown {
    switch (identName) {
      case 'true':
        return true
      case 'false':
        return false
      case 'null':
        return null
      case 'undefined':
        return undefined
      default:
        return Object.hasOwn(scope, identName) ? scope[identName] : undefined
    }
  }

  /**
   * Resolve member access to own property.
   * @description Reads only own properties via Object.hasOwn.
   * @param exprNode - Member AST node
   * @param scope - Scope data for identifiers
   * @returns Resolved value or undefined
   */
  private static evalMember(
    exprNode: Extract<Types.ExprNode, { type: 'member' }>,
    scope: Types.DataRecord
  ): unknown {
    const objectValue = Eval.evalNode(exprNode.object, scope)
    return EngineParts.Utils.readOwn(objectValue, exprNode.property)
  }

  /**
   * Evaluate single AST node.
   * @description Whitelist dispatch rejecting any unknown node type.
   * @param exprNode - Expression AST node
   * @param scope - Scope data for identifiers
   * @returns Evaluated value
   * @throws {Deno.errors.InvalidData} When the node type is not whitelisted
   */
  private static evalNode(exprNode: Types.ExprNode, scope: Types.DataRecord): unknown {
    switch (exprNode.type) {
      case 'literal':
        return exprNode.value
      case 'ident':
        return Eval.evalIdent(exprNode.name, scope)
      case 'member':
        return Eval.evalMember(exprNode, scope)
      case 'unary':
        return Eval.evalUnary(exprNode, scope)
      case 'binary':
        return Eval.evalBinary(exprNode, scope)
      case 'ternary':
        return Eval.evalNode(exprNode.test, scope)
          ? Eval.evalNode(exprNode.consequent, scope)
          : Eval.evalNode(exprNode.alternate, scope)
      default:
        throw new Deno.errors.InvalidData(
          `Unsupported DVE expression node "${(exprNode as Types.ExprTypeCarrier).type}"`
        )
    }
  }

  /**
   * Evaluate unary expression node.
   * @description Rejects any operator outside the unary grammar.
   * @param exprNode - Unary AST node
   * @param scope - Scope data for identifiers
   * @returns Evaluated value
   * @throws {Deno.errors.InvalidData} When the operator is not whitelisted
   */
  private static evalUnary(
    exprNode: Extract<Types.ExprNode, { type: 'unary' }>,
    scope: Types.DataRecord
  ): unknown {
    const argValue = Eval.evalNode(exprNode.arg, scope)
    switch (exprNode.op) {
      case '!':
        return !argValue
      case '+':
        return typeof argValue === 'number' ? argValue : Number(argValue)
      case '-':
        return -(typeof argValue === 'number' ? argValue : Number(argValue))
      default:
        throw new Deno.errors.InvalidData(
          `Unsupported DVE unary operator "${(exprNode as Types.ExprOpCarrier).op}"`
        )
    }
  }
}
