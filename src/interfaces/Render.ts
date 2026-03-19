/** AST node for DVE template (render engine internal). */
export type AstNode =
  | { type: 'each'; path: string; itemName: string; nodes: AstNode[] }
  | { type: 'if'; path: string; thenNodes: AstNode[]; elseNodes: AstNode[] }
  | { type: 'include'; templatePath: string }
  | { type: 'text'; value: string }
  | { type: 'var'; path: string; raw: boolean }

/** Compiled DVE template result (render engine internal). */
export type CompileResult = { ast: AstNode[] }

/** Expression token for DVE expression evaluator (render engine internal). */
export type ExprToken =
  | { kind: 'op'; value: string }
  | { kind: 'ident'; value: string }
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }

/** Expression AST node for DVE expression evaluator (render engine internal). */
export type ExprNode =
  | { type: 'literal'; value: unknown }
  | { type: 'ident'; name: string }
  | { type: 'member'; object: ExprNode; property: string; optional: boolean }
  | { type: 'unary'; op: '!' | '+' | '-'; arg: ExprNode }
  | { type: 'binary'; op: string; left: ExprNode; right: ExprNode }
  | { type: 'ternary'; test: ExprNode; consequent: ExprNode; alternate: ExprNode }

/** Stack frame for DVE template parser (render engine internal). */
export type DveStackFrame = { kind: 'if' | 'each'; node: AstNode; inElse: boolean }

/** Options for constructing rendering Engine. */
export type EngineOptions = { viewsDir: string }

/**
 * View engine for templates
 * @description Renders DVE templates to HTML strings
 */
export interface ViewEngine {
  /**
   * Render template to HTML
   * @description Renders DVE template with scope data
   * @param templatePath - Relative template path
   * @param data - Template scope data
   * @returns Rendered HTML string
   */
  render(templatePath: string, data?: Record<string, unknown>): Promise<string>
}
